import { supabase } from '@/integrations/supabase/client';

/**
 * Create publications for all active groups when an auction becomes active.
 */
export async function publishAuctionToGroups(auctionId: string, auctionTitle: string) {
  // Get all active groups
  const { data: groups } = await supabase
    .from('telegram_groups')
    .select('id, name')
    .eq('is_active', true);

  if (!groups || groups.length === 0) return;

  // Check existing publications to avoid duplicates
  const { data: existing } = await supabase
    .from('auction_group_publications')
    .select('group_id')
    .eq('auction_id', auctionId);

  const existingGroupIds = new Set(existing?.map((p) => p.group_id) || []);

  const newPubs = groups
    .filter((g) => !existingGroupIds.has(g.id))
    .map((g) => ({
      auction_id: auctionId,
      group_id: g.id,
      status: 'posted' as const,
      published_at: new Date().toISOString(),
      message_id: `demo-${Date.now()}-${g.id.slice(0, 4)}`,
    }));

  if (newPubs.length === 0) return;

  const { error } = await supabase.from('auction_group_publications').insert(newPubs);
  if (error) throw error;

  // Log activity for each publication
  for (const pub of newPubs) {
    const group = groups.find((g) => g.id === pub.group_id);
    await supabase.from('activity_log').insert({
      entity_type: 'publication',
      entity_id: auctionId,
      action: 'publication_created',
      description: `Subasta "${auctionTitle}" publicada en ${group?.name}`,
    });
  }
}
