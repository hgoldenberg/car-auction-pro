import { supabase } from '@/integrations/supabase/client';
import type { AuctionStatus, BidStatus, LeadStatus } from '@/lib/types';
import { publishAuctionToGroups } from '@/lib/telegram-actions';

// ── Auction state transitions ──────────────────────────────────────

const VALID_AUCTION_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  draft: ['scheduled', 'active', 'cancelled'],
  scheduled: ['active', 'cancelled'],
  active: ['paused', 'closed', 'cancelled'],
  paused: ['active', 'closed', 'cancelled'],
  closed: ['awarded'],
  awarded: [],
  cancelled: [],
};

export function canTransitionAuction(from: AuctionStatus, to: AuctionStatus): boolean {
  return VALID_AUCTION_TRANSITIONS[from]?.includes(to) ?? false;
}

async function logActivity(entityType: string, entityId: string | null, action: string, description: string) {
  await supabase.from('activity_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    description,
  });
}

// ── Activate auction ───────────────────────────────────────────────

export async function activateAuction(auctionId: string) {
  const { data: auction } = await supabase
    .from('auctions')
    .select('*, vehicles(status)')
    .eq('id', auctionId)
    .single();

  if (!auction) throw new Error('Subasta no encontrada');
  if (!canTransitionAuction(auction.status, 'active'))
    throw new Error(`No se puede activar una subasta en estado "${auction.status}"`);

  const vehicleStatus = (auction as any).vehicles?.status;
  if (!['ready', 'published'].includes(vehicleStatus))
    throw new Error(`El vehículo debe estar "listo" o "publicado" (actual: "${vehicleStatus}")`);

  const { error } = await supabase
    .from('auctions')
    .update({ status: 'active', start_date: new Date().toISOString() })
    .eq('id', auctionId);
  if (error) throw error;

  await logActivity('auction', auctionId, 'auction_activated', `Subasta activada: ${auction.title}`);

  // Auto-publish to all active groups
  try {
    await publishAuctionToGroups(auctionId, auction.title);
  } catch (e) {
    console.warn('Auto-publish failed:', e);
  }
}

// ── Pause auction ──────────────────────────────────────────────────

export async function pauseAuction(auctionId: string) {
  const { data: auction } = await supabase.from('auctions').select('*').eq('id', auctionId).single();
  if (!auction) throw new Error('Subasta no encontrada');
  if (!canTransitionAuction(auction.status, 'paused'))
    throw new Error(`No se puede pausar una subasta en estado "${auction.status}"`);

  const { error } = await supabase.from('auctions').update({ status: 'paused' }).eq('id', auctionId);
  if (error) throw error;

  await logActivity('auction', auctionId, 'auction_paused', `Subasta pausada: ${auction.title}`);
}

// ── Close auction ──────────────────────────────────────────────────

export async function closeAuction(auctionId: string) {
  const { data: auction } = await supabase.from('auctions').select('*').eq('id', auctionId).single();
  if (!auction) throw new Error('Subasta no encontrada');
  if (!canTransitionAuction(auction.status, 'closed'))
    throw new Error(`No se puede cerrar una subasta en estado "${auction.status}"`);

  // Find the leading bid and mark it as winning
  const { data: leadingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('status', 'leading')
    .single();

  if (leadingBid) {
    await supabase.from('bids').update({ status: 'winning' as BidStatus }).eq('id', leadingBid.id);
  }

  const { error } = await supabase
    .from('auctions')
    .update({ status: 'closed', end_date: new Date().toISOString() })
    .eq('id', auctionId);
  if (error) throw error;

  await logActivity('auction', auctionId, 'auction_closed', `Subasta cerrada: ${auction.title}`);
}

// ── Award auction ──────────────────────────────────────────────────

export async function awardAuction(auctionId: string) {
  const { data: auction } = await supabase.from('auctions').select('*').eq('id', auctionId).single();
  if (!auction) throw new Error('Subasta no encontrada');
  if (!canTransitionAuction(auction.status, 'awarded'))
    throw new Error(`No se puede adjudicar una subasta en estado "${auction.status}"`);

  const { data: winningBid } = await supabase
    .from('bids')
    .select('*, leads(full_name)')
    .eq('auction_id', auctionId)
    .eq('status', 'winning')
    .single();

  if (!winningBid)
    throw new Error('No existe una oferta ganadora. Cierre la subasta primero.');

  const { error } = await supabase.from('auctions').update({ status: 'awarded' }).eq('id', auctionId);
  if (error) throw error;

  // Mark lead as winner
  await supabase.from('leads').update({ status: 'winner' as LeadStatus }).eq('id', winningBid.lead_id);

  const leadName = (winningBid as any).leads?.full_name || 'Desconocido';
  await logActivity('auction', auctionId, 'auction_awarded',
    `Subasta adjudicada a ${leadName} por ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(winningBid.amount)}`
  );
}

// ── Submit bid (with leading logic) ────────────────────────────────

export async function submitBid(auctionId: string, leadId: string, amount: number, notes?: string) {
  const { data: auction } = await supabase.from('auctions').select('*').eq('id', auctionId).single();
  if (!auction) throw new Error('Subasta no encontrada');
  if (auction.status !== 'active')
    throw new Error('Solo se pueden registrar ofertas en subastas activas');

  // Set previous leading to outbid
  await supabase
    .from('bids')
    .update({ status: 'outbid' as BidStatus })
    .eq('auction_id', auctionId)
    .eq('status', 'leading');

  // Insert new bid as leading
  const { error } = await supabase.from('bids').insert({
    auction_id: auctionId,
    lead_id: leadId,
    amount,
    notes: notes || null,
    status: 'leading' as BidStatus,
  });
  if (error) throw error;

  // Update auction high bid and count
  await supabase.from('auctions').update({
    current_high_bid: amount,
    bid_count: (auction.bid_count || 0) + 1,
  }).eq('id', auctionId);

  // Update lead status + latest_bid_amount + last_activity_at
  const { data: leadBidCount } = await supabase
    .from('bids')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId);

  const newLeadStatus: LeadStatus = (leadBidCount as any)?.length > 1 ? 'active_bidder' : 'bid_once';
  await supabase.from('leads').update({
    status: newLeadStatus,
    latest_bid_amount: amount,
    last_activity_at: new Date().toISOString(),
  }).eq('id', leadId);

  await logActivity('bid', null, 'bid_received',
    `Nueva oferta de $${amount.toLocaleString('es-AR')} en ${auction.title}`
  );
  await logActivity('bid', null, 'leading_bid_updated',
    `Oferta líder actualizada a $${amount.toLocaleString('es-AR')} en ${auction.title}`
  );
}

// ── Change lead status ─────────────────────────────────────────────

export async function changeLeadStatus(leadId: string, newStatus: LeadStatus) {
  // Validate: can't mark as winner without winning bid
  if (newStatus === 'winner') {
    const { data: winningBids } = await supabase
      .from('bids')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'winning');
    if (!winningBids || winningBids.length === 0)
      throw new Error('No se puede marcar como ganador sin una oferta ganadora asociada');
  }

  const { data: lead } = await supabase.from('leads').select('full_name').eq('id', leadId).single();
  const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
  if (error) throw error;

  await logActivity('lead', leadId, 'lead_updated',
    `${lead?.full_name} movido a ${newStatus.replace(/_/g, ' ')}`
  );
}

// ── Add lead note ──────────────────────────────────────────────────

export async function addLeadNote(leadId: string, content: string) {
  const { error } = await supabase.from('lead_notes').insert({ lead_id: leadId, content });
  if (error) throw error;

  const { data: lead } = await supabase.from('leads').select('full_name').eq('id', leadId).single();
  await logActivity('lead', leadId, 'note_added', `Nota agregada para ${lead?.full_name}`);
}
