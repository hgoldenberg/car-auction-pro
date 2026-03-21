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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { update } = body;

    if (!update?.message) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    // Only handle /start commands
    if (!text.startsWith('/start')) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parts = text.split(/\s+/);
    const auctionId = parts[1] || null;

    if (!auctionId) {
      // /start without context
      await sendTelegramMessage(chatId, '👋 ¡Bienvenido a Subasta Privada Auto!\n\nPara ofertar, usá el botón "Ofertar en privado" en la publicación del grupo.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true, action: 'welcome' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate auction exists
    const { data: auction, error: auctionErr } = await supabase
      .from('auctions')
      .select('*, vehicles(make, model, year, trim)')
      .eq('id', auctionId)
      .single();

    if (auctionErr || !auction) {
      await sendTelegramMessage(chatId, '❌ No se pudo identificar la subasta. Verificá el enlace o contactá al administrador.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true, action: 'invalid_auction' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const vehicle = (auction as any).vehicles;
    const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title;
    const trimText = vehicle?.trim ? ` ${vehicle.trim}` : '';

    const formatARS = (n: number | null) => n ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n) : '-';

    const statusText = auction.status === 'active' ? '🟢 Activa' : `🔴 ${auction.status}`;

    const responseText = [
      `🚗 *${vehicleTitle}*${trimText}`,
      '',
      `${statusText}`,
      `💰 Precio inicial: ${formatARS(auction.starting_price)}`,
      auction.current_high_bid > 0 ? `🏆 Oferta líder: ${formatARS(auction.current_high_bid)}` : '',
      auction.bid_count > 0 ? `📊 ${auction.bid_count} oferta${auction.bid_count > 1 ? 's' : ''}` : '',
      '',
      auction.status === 'active'
        ? '✍️ Enviá tu oferta como mensaje en este chat (solo el monto en números).'
        : '⚠️ Esta subasta no está activa actualmente.',
    ].filter(Boolean).join('\n');

    await sendTelegramMessage(chatId, responseText, LOVABLE_API_KEY, TELEGRAM_API_KEY, 'Markdown');

    // Log the interaction
    await supabase.from('activity_log').insert({
      entity_type: 'bot',
      entity_id: auctionId,
      action: 'bot_start_received',
      description: `Usuario inició chat privado para subasta "${auction.title}"`,
      metadata: { chat_id: chatId, telegram_user: message.from },
    });

    return new Response(JSON.stringify({ ok: true, action: 'auction_context_sent', auction_id: auctionId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-bot-handler error:', error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function sendTelegramMessage(chatId: number, text: string, lovableKey: string, telegramKey: string, parseMode?: string) {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
