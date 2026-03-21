import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MIN_BID_INCREMENT = 50000; // ARS $50,000 minimum increment

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return jsonResponse({ error: 'LOVABLE_API_KEY not configured' }, 500);

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return jsonResponse({ error: 'TELEGRAM_API_KEY not configured' }, 500);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { update } = body;

    if (!update?.message) {
      return jsonResponse({ ok: true, skipped: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const telegramUser = message.from;

    // --- Handle /start command ---
    if (text.startsWith('/start')) {
      return await handleStart(supabase, chatId, text, telegramUser, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    // --- Handle bid amounts ---
    // Check if text is a number (allow dots, commas, spaces as thousand separators)
    const cleanedText = text.replace(/[\s.,]/g, '');
    const amount = parseInt(cleanedText, 10);

    if (!isNaN(amount) && amount > 0) {
      return await handleBid(supabase, chatId, amount, telegramUser, update.update_id, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    // --- Unknown message ---
    // Only respond if user has context
    const { data: ctx } = await supabase
      .from('telegram_chat_context')
      .select('auction_id')
      .eq('chat_id', chatId)
      .single();

    if (ctx) {
      await sendTelegram(chatId, '📝 Enviá solo el monto numérico de tu oferta.\n\nEjemplo: 5500000', LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    return jsonResponse({ ok: true, action: 'ignored' });

  } catch (error) {
    console.error('telegram-bot-handler error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ── /start handler ──────────────────────────────────────────────

async function handleStart(
  supabase: any, chatId: number, text: string, telegramUser: any,
  lovableKey: string, telegramKey: string
) {
  const parts = text.split(/\s+/);
  const auctionId = parts[1] || null;

  if (!auctionId) {
    await sendTelegram(chatId, '👋 ¡Bienvenido a Subasta Privada Auto!\n\nPara ofertar, usá el botón "Ofertar en privado" en la publicación del grupo.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'welcome' });
  }

  // Validate auction
  const { data: auction, error: auctionErr } = await supabase
    .from('auctions')
    .select('*, vehicles(make, model, year, trim)')
    .eq('id', auctionId)
    .single();

  if (auctionErr || !auction) {
    await sendTelegram(chatId, '❌ No se pudo identificar la subasta. Verificá el enlace o contactá al administrador.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'invalid_auction' });
  }

  // Save/update context
  await supabase.from('telegram_chat_context').upsert({
    chat_id: chatId,
    auction_id: auctionId,
    telegram_user_id: telegramUser?.id || null,
    telegram_username: telegramUser?.username || null,
    telegram_first_name: telegramUser?.first_name || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'chat_id' });

  const vehicle = auction.vehicles;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title;
  const trimText = vehicle?.trim ? ` ${vehicle.trim}` : '';
  const formatARS = (n: number | null) => n ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n) : '-';

  const statusText = auction.status === 'active' ? '🟢 Activa' : `🔴 ${auction.status}`;
  const minBid = Math.max(
    (auction.current_high_bid || 0) + MIN_BID_INCREMENT,
    (auction.starting_price || 0)
  );

  const responseText = [
    `🚗 *${vehicleTitle}*${trimText}`,
    '',
    statusText,
    `💰 Precio inicial: ${formatARS(auction.starting_price)}`,
    auction.current_high_bid > 0 ? `🏆 Oferta líder: ${formatARS(auction.current_high_bid)}` : '',
    auction.bid_count > 0 ? `📊 ${auction.bid_count} oferta${auction.bid_count > 1 ? 's' : ''}` : '',
    '',
    auction.status === 'active'
      ? `✍️ Oferta mínima: ${formatARS(minBid)}\nEnviá el monto como mensaje (solo números).`
      : '⚠️ Esta subasta no está activa actualmente.',
  ].filter(Boolean).join('\n');

  await sendTelegram(chatId, responseText, lovableKey, telegramKey, 'Markdown');

  // Log
  await supabase.from('activity_log').insert({
    entity_type: 'bot',
    entity_id: auctionId,
    action: 'bot_start_received',
    description: `Usuario @${telegramUser?.username || telegramUser?.first_name || chatId} inició chat para subasta "${auction.title}"`,
    metadata: { chat_id: chatId, telegram_user: telegramUser },
  });

  return jsonResponse({ ok: true, action: 'auction_context_sent', auction_id: auctionId });
}

// ── Bid handler ─────────────────────────────────────────────────

async function handleBid(
  supabase: any, chatId: number, amount: number, telegramUser: any, updateId: number,
  lovableKey: string, telegramKey: string
) {
  // Get context
  const { data: ctx } = await supabase
    .from('telegram_chat_context')
    .select('auction_id')
    .eq('chat_id', chatId)
    .single();

  if (!ctx) {
    await sendTelegram(chatId, '⚠️ No tenés una subasta seleccionada.\n\nUsá el botón "Ofertar en privado" en la publicación del grupo para empezar.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'no_context' });
  }

  const auctionId = ctx.auction_id;

  // Get auction
  const { data: auction } = await supabase
    .from('auctions')
    .select('*, vehicles(make, model, year)')
    .eq('id', auctionId)
    .single();

  if (!auction) {
    await sendTelegram(chatId, '❌ La subasta ya no existe.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'auction_not_found' });
  }

  if (auction.status !== 'active') {
    await sendTelegram(chatId, '⚠️ Esta subasta no está activa actualmente. No se aceptan ofertas.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'auction_not_active' });
  }

  // Validate minimum bid
  const currentHigh = auction.current_high_bid || 0;
  const minBid = Math.max(currentHigh + MIN_BID_INCREMENT, auction.starting_price || 0);
  const formatARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  if (amount < minBid) {
    await sendTelegram(chatId, `❌ Tu oferta de ${formatARS(amount)} no alcanza el mínimo.\n\n💰 Oferta mínima: ${formatARS(minBid)}`, lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'bid_too_low' });
  }

  // Idempotency: check if this update_id was already processed
  const idempotencyKey = `tg-${updateId}`;
  const { data: existingBid } = await supabase
    .from('bids')
    .select('id')
    .eq('notes', idempotencyKey)
    .single();

  if (existingBid) {
    return jsonResponse({ ok: true, action: 'duplicate_skipped' });
  }

  // Find or create lead
  const lead = await findOrCreateLead(supabase, telegramUser, chatId);

  // Create bid
  const { data: newBid, error: bidErr } = await supabase
    .from('bids')
    .insert({
      auction_id: auctionId,
      lead_id: lead.id,
      amount,
      status: 'leading',
      notes: idempotencyKey,
    })
    .select('id')
    .single();

  if (bidErr) {
    console.error('Error creating bid:', bidErr);
    await sendTelegram(chatId, '❌ Error al registrar tu oferta. Intentá de nuevo.', lovableKey, telegramKey);
    return jsonResponse({ ok: true, action: 'bid_error' });
  }

  // Mark previous leading bids as outbid
  await supabase
    .from('bids')
    .update({ status: 'outbid' })
    .eq('auction_id', auctionId)
    .eq('status', 'leading')
    .neq('id', newBid.id);

  // Update auction counters
  await supabase
    .from('auctions')
    .update({
      current_high_bid: amount,
      bid_count: (auction.bid_count || 0) + 1,
    })
    .eq('id', auctionId);

  // Activity log
  const vehicle = auction.vehicles;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title;

  await supabase.from('activity_log').insert({
    entity_type: 'bid',
    entity_id: newBid.id,
    action: 'bid_received',
    description: `Oferta ${formatARS(amount)} recibida vía Telegram para "${vehicleTitle}"`,
    metadata: { auction_id: auctionId, amount, chat_id: chatId, telegram_user: telegramUser },
  });

  // Confirm to user
  await sendTelegram(chatId, [
    `✅ ¡Oferta registrada!`,
    '',
    `🚗 ${vehicleTitle}`,
    `💰 Tu oferta: ${formatARS(amount)}`,
    `🏆 Sos el líder actual`,
    '',
    `Podés enviar un nuevo monto para mejorar tu oferta.`,
  ].join('\n'), lovableKey, telegramKey);

  return jsonResponse({ ok: true, action: 'bid_created', bid_id: newBid.id, amount });
}

// ── Lead helper ─────────────────────────────────────────────────

async function findOrCreateLead(supabase: any, telegramUser: any, chatId: number) {
  const username = telegramUser?.username || null;
  const firstName = telegramUser?.first_name || `Telegram ${chatId}`;

  // Try to find existing lead by telegram_username
  if (username) {
    const { data: existing } = await supabase
      .from('leads')
      .select('*')
      .eq('telegram_username', username)
      .single();

    if (existing) return existing;
  }

  // Create new lead
  const { data: newLead } = await supabase
    .from('leads')
    .insert({
      full_name: firstName,
      telegram_username: username,
      status: 'interested',
    })
    .select('*')
    .single();

  // Log lead creation
  await supabase.from('activity_log').insert({
    entity_type: 'lead',
    entity_id: newLead.id,
    action: 'lead_updated',
    description: `Lead "${firstName}" creado automáticamente desde Telegram`,
  });

  return newLead;
}

// ── Telegram send helper ────────────────────────────────────────

async function sendTelegram(chatId: number, text: string, lovableKey: string, telegramKey: string, parseMode?: string) {
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

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
