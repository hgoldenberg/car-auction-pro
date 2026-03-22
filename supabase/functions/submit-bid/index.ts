import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MIN_BID_INCREMENT = 50000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { auction_id, amount, bidder_name } = await req.json();

    if (!auction_id || !amount || !bidder_name) {
      return json({ error: 'Faltan datos: auction_id, amount y bidder_name son obligatorios.' }, 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return json({ error: 'El monto debe ser un número positivo.' }, 400);
    }

    // Get auction
    const { data: auction, error: auctionErr } = await supabase
      .from('auctions')
      .select('*, vehicles(make, model, year)')
      .eq('id', auction_id)
      .single();

    if (auctionErr || !auction) {
      return json({ error: 'Subasta no encontrada.' }, 404);
    }

    if (auction.status !== 'active') {
      return json({ error: 'Esta subasta no está activa. No se aceptan ofertas.' });
    }

    // Find or create lead early (needed for rejected bid recording too)
    const lead = await findOrCreateLead(supabase, bidder_name.trim());

    // Validate minimum
    const currentHigh = auction.current_high_bid || 0;
    const minBid = Math.max(currentHigh + MIN_BID_INCREMENT, auction.starting_price || 0);

    const formatARS = (n: number) =>
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

    if (numAmount < minBid) {
      // Record rejected bid for audit trail (consistent with bot handler)
      await supabase.from('bids').insert({
        auction_id, lead_id: lead.id, amount: numAmount, status: 'rejected',
        notes: `miniapp-rejected-${Date.now()}`,
      });
      await supabase.from('activity_log').insert({
        entity_type: 'bid', entity_id: auction_id, action: 'bid_rejected',
        description: `Oferta ${formatARS(numAmount)} rechazada vía Mini App: mínimo ${formatARS(minBid)}`,
        metadata: { auction_id, amount: numAmount, min_bid: minBid, source: 'miniapp', reason: 'bid_too_low' },
      });
      return json({ error: `Tu oferta no alcanza el mínimo de ${formatARS(minBid)}.` });
    }

    // Lead already created above

    // Create bid
    const { data: newBid, error: bidErr } = await supabase
      .from('bids')
      .insert({
        auction_id,
        lead_id: lead.id,
        amount: numAmount,
        status: 'leading',
        notes: `miniapp-${Date.now()}`,
      })
      .select('id')
      .single();

    if (bidErr) {
      console.error('Bid insert error:', bidErr);
      return json({ error: 'Error al registrar la oferta. Intentá de nuevo.' }, 500);
    }

    // Mark previous leading bids as outbid
    await supabase
      .from('bids')
      .update({ status: 'outbid' })
      .eq('auction_id', auction_id)
      .eq('status', 'leading')
      .neq('id', newBid.id);

    // Update auction counters
    await supabase
      .from('auctions')
      .update({
        current_high_bid: numAmount,
        bid_count: (auction.bid_count || 0) + 1,
      })
      .eq('id', auction_id);

    // Update lead
    await supabase
      .from('leads')
      .update({
        latest_bid_amount: numAmount,
        last_activity_at: new Date().toISOString(),
        status: lead.status === 'new' || lead.status === 'interested' ? 'active_bidder' : lead.status,
      })
      .eq('id', lead.id);

    const vehicle = auction.vehicles;
    const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title;

    // Activity log
    await supabase.from('activity_log').insert({
      entity_type: 'bid',
      entity_id: newBid.id,
      action: 'bid_received',
      description: `Oferta ${formatARS(numAmount)} recibida vía Mini App para "${vehicleTitle}"`,
      metadata: { auction_id, amount: numAmount, source: 'miniapp', bidder_name: bidder_name.trim() },
    });

    // Notify Telegram groups with active publications
    await notifyGroups(supabase, auction_id, vehicleTitle, numAmount, (auction.bid_count || 0) + 1, auction.end_date);

    return json({ ok: true, bid_id: newBid.id, amount: numAmount });

  } catch (error) {
    console.error('submit-bid error:', error);
    return json({ error: error instanceof Error ? error.message : 'Error interno.' }, 500);
  }
});

async function findOrCreateLead(supabase: any, name: string) {
  // Try find by name (case-insensitive)
  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .ilike('full_name', name)
    .limit(1)
    .single();

  if (existing) return existing;

  const { data: newLead } = await supabase
    .from('leads')
    .insert({ full_name: name, status: 'interested' })
    .select('*')
    .single();

  await supabase.from('activity_log').insert({
    entity_type: 'lead',
    entity_id: newLead.id,
    action: 'lead_updated',
    description: `Lead "${name}" creado desde Mini App de oferta`,
  });

  return newLead;
}

async function notifyGroups(
  supabase: any, auctionId: string, vehicleTitle: string,
  amount: number, bidCount: number, endDate: string | null
) {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;

    const { data: publications } = await supabase
      .from('auction_group_publications')
      .select('group_id, telegram_groups(chat_id, is_active, is_real_group)')
      .eq('auction_id', auctionId)
      .eq('status', 'posted')
      .eq('publication_type', 'real');

    if (!publications || publications.length === 0) return;

    const formatARS = (n: number) =>
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

    const closingText = endDate
      ? `⏰ Cierre: ${new Date(endDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${new Date(endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
      : '';

    const text = [
      `🔔 *Nueva oferta líder*`,
      '',
      `🚗 ${vehicleTitle}`,
      `💰 ${formatARS(amount)}`,
      `📊 ${bidCount} oferta${bidCount > 1 ? 's' : ''}`,
      closingText,
    ].filter(Boolean).join('\n');

    const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

    for (const pub of publications) {
      const group = pub.telegram_groups;
      if (!group?.chat_id || !group.is_active || !group.is_real_group) continue;

      await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: Number(group.chat_id), text, parse_mode: 'Markdown' }),
      });
    }
  } catch (e) {
    console.error('Error notifying groups:', e);
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Content-Type': 'application/json',
    },
  });
}