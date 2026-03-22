import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Verify auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify user via anon client
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { auction_id, group_ids } = body;

    if (!auction_id || !group_ids || !Array.isArray(group_ids) || group_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'auction_id and group_ids[] required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get auction with vehicle
    const { data: auction, error: auctionErr } = await supabase
      .from('auctions')
      .select('*, vehicles(make, model, year, trim, color, km)')
      .eq('id', auction_id)
      .single();

    if (auctionErr || !auction) {
      return new Response(JSON.stringify({ error: 'Auction not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (auction.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Solo se puede publicar subastas activas' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const vehicle = (auction as any).vehicles;
    const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title;

    // Get vehicle main image
    let photoUrl: string | null = null;
    if (auction.vehicle_id) {
      const { data: mainImg } = await supabase
        .from('vehicle_images')
        .select('storage_path')
        .eq('vehicle_id', auction.vehicle_id)
        .eq('is_main', true)
        .single();

      if (mainImg) {
        const { data: urlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(mainImg.storage_path);
        photoUrl = urlData?.publicUrl || null;
      }
    }

    // Get real groups
    const { data: groups } = await supabase
      .from('telegram_groups')
      .select('*')
      .in('id', group_ids)
      .eq('is_active', true)
      .eq('is_real_group', true);

    if (!groups || groups.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay grupos reales activos seleccionados' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build message text
    const formatARS = (n: number | null) => n ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n) : '-';

    const closeDateText = auction.end_date
      ? new Date(auction.end_date).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Sin fecha definida';

    const lines = [
      `🚗 *${vehicleTitle}*`,
      vehicle?.trim ? `${vehicle.trim}` : '',
      '',
      [
        vehicle?.km ? `📏 ${vehicle.km.toLocaleString('es-AR')} km` : '',
        vehicle?.color ? `🎨 ${vehicle.color}` : '',
      ].filter(Boolean).join('  ·  '),
      '',
      `💰 Inicio: ${formatARS(auction.starting_price)}`,
      auction.current_high_bid > 0 ? `🏆 Líder: ${formatARS(auction.current_high_bid)}` : '',
      auction.bid_count > 0 ? `📊 ${auction.bid_count} oferta${auction.bid_count > 1 ? 's' : ''}` : '',
      `⏰ Cierre: ${closeDateText}`,
    ].filter(Boolean).join('\n');

    // Gallery URL (public page)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://car-auction-pro.lovable.app';
    const galleryUrl = `${siteUrl}/galeria/${auction_id}`;

    // Inline keyboard buttons — Mini App for bidding
    const bidUrl = `${siteUrl}/ofertar/${auction_id}`;
    const reply_markup = {
      inline_keyboard: [
        [{ text: '💰 Ofertar', web_app: { url: bidUrl } }],
        [{ text: '📸 Ver galería', url: galleryUrl }],
      ]
    };

    const results: Array<{ group_id: string; group_name: string; success: boolean; message_id?: number; error?: string }> = [];

    for (const group of groups) {
      if (!group.chat_id) {
        results.push({ group_id: group.id, group_name: group.name, success: false, error: 'Sin chat_id configurado' });
        continue;
      }

      try {
        // Check for existing publication to handle re-publish
        const { data: existingPub } = await supabase
          .from('auction_group_publications')
          .select('id, external_message_id')
          .eq('auction_id', auction_id)
          .eq('group_id', group.id)
          .eq('publication_type', 'real')
          .eq('status', 'posted')
          .single();

        // Try to delete old Telegram message if re-publishing
        if (existingPub?.external_message_id) {
          try {
            await fetch(`${GATEWAY_URL}/deleteMessage`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TELEGRAM_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: group.chat_id,
                message_id: Number(existingPub.external_message_id),
              }),
            });
          } catch (_) {
            // Old message may already be deleted, continue anyway
          }
        }

        let tgResponse;
        let tgData;

        if (photoUrl) {
          tgResponse = await fetch(`${GATEWAY_URL}/sendPhoto`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: group.chat_id,
              photo: photoUrl,
              caption: lines,
              parse_mode: 'Markdown',
              reply_markup,
            }),
          });
        } else {
          tgResponse = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: group.chat_id,
              text: lines,
              parse_mode: 'Markdown',
              reply_markup,
            }),
          });
        }

        tgData = await tgResponse.json();

        if (!tgResponse.ok || !tgData.ok) {
          const errMsg = tgData.description || `HTTP ${tgResponse.status}`;
          results.push({ group_id: group.id, group_name: group.name, success: false, error: errMsg });

          if (!existingPub) {
            await supabase.from('auction_group_publications').insert({
              auction_id,
              group_id: group.id,
              status: 'failed',
              publication_type: 'real',
              error_message: errMsg,
              published_at: new Date().toISOString(),
            });
          }

          await supabase.from('activity_log').insert({
            entity_type: 'publication',
            entity_id: auction_id,
            action: 'publication_failed',
            description: `Publicación falló en ${group.name}: ${errMsg}`,
          });
        } else {
          const messageId = tgData.result?.message_id;
          results.push({ group_id: group.id, group_name: group.name, success: true, message_id: messageId });

          if (existingPub) {
            // Update existing publication record
            await supabase.from('auction_group_publications')
              .update({
                external_message_id: String(messageId),
                message_id: `real-${messageId}`,
                published_at: new Date().toISOString(),
                error_message: null,
              })
              .eq('id', existingPub.id);
          } else {
            await supabase.from('auction_group_publications').insert({
              auction_id,
              group_id: group.id,
              status: 'posted',
              publication_type: 'real',
              external_message_id: String(messageId),
              message_id: `real-${messageId}`,
              published_at: new Date().toISOString(),
            });
          }

          const actionLabel = existingPub ? 'republication_created' : 'publication_created';
          const descLabel = existingPub ? 'republicada' : 'publicada';
          await supabase.from('activity_log').insert({
            entity_type: 'publication',
            entity_id: auction_id,
            action: actionLabel,
            description: `Subasta "${auction.title}" ${descLabel} en ${group.name} (Telegram real)`,
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ group_id: group.id, group_name: group.name, success: false, error: errMsg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: failCount === 0,
      published: successCount,
      failed: failCount,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-publish error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
