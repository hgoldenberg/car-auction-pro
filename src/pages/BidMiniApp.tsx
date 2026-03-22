import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import { formatCurrency } from '@/lib/formatters';
import { Shield, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';

const MIN_BID_INCREMENT = 50000;

function humanizeError(raw: string): string {
  if (!raw) return 'Ocurrió un error inesperado. Intentá de nuevo.';
  const lower = raw.toLowerCase();
  if (lower.includes('edge function') || lower.includes('non-2xx') || lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'No pudimos procesar tu oferta. Probá nuevamente en unos segundos.';
  }
  if (lower.includes('fetch') || lower.includes('timeout') || lower.includes('aborted')) {
    return 'La conexión falló. Verificá tu internet e intentá de nuevo.';
  }
  // Backend errors are already in Spanish — pass through
  return raw;
}

export default function BidMiniApp() {
  const { auctionId } = useParams();
  const [bidInput, setBidInput] = useState('');
  const [bidderName, setBidderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bid-miniapp', auctionId],
    queryFn: async () => {
      const { data: auction } = await supabase
        .from('auctions')
        .select('id, title, starting_price, current_high_bid, bid_count, status, end_date, vehicles(id, make, model, year, trim, color, km)')
        .eq('id', auctionId!)
        .single();
      if (!auction) return null;

      const vehicle = (auction as any).vehicles;
      if (!vehicle) return null;

      const { data: mainImg } = await supabase
        .from('vehicle_images')
        .select('storage_path')
        .eq('vehicle_id', vehicle.id)
        .eq('is_main', true)
        .single();

      const photoUrl = mainImg ? getVehicleImageUrl(mainImg.storage_path) : null;

      const currentHigh = auction.current_high_bid || 0;
      const minBid = Math.max(currentHigh + MIN_BID_INCREMENT, auction.starting_price || 0);

      return { auction, vehicle, photoUrl, minBid };
    },
  });

  const parsedAmount = parseInt(bidInput.replace(/\D/g, ''), 10) || 0;

  const handleSubmit = async () => {
    if (!data || !auctionId) return;

    if (!bidderName.trim()) {
      setResult({ success: false, message: 'Ingresá tu nombre para identificarte.' });
      return;
    }
    if (parsedAmount <= 0) {
      setResult({ success: false, message: 'Ingresá un monto numérico válido.' });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const { data: resp, error } = await supabase.functions.invoke('submit-bid', {
        body: { auction_id: auctionId, amount: parsedAmount, bidder_name: bidderName.trim() },
      });

      if (error) throw new Error(error.message);
      if (resp?.error) {
        setResult({ success: false, message: humanizeError(resp.error) });
      } else {
        setResult({ success: true, message: `¡Oferta de ${formatCurrency(parsedAmount)} registrada! Sos el nuevo líder.` });
        setBidInput('');
        refetch();
      }
    } catch (e: any) {
      setResult({ success: false, message: humanizeError(e.message || '') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillMin = () => {
    if (data) {
      setBidInput(String(data.minBid));
      setResult(null);
    }
  };

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/[^\d]/g, '');
    setBidInput(digits);
    if (result && !result.success) setResult(null);
  };

  // Format display value with thousand separators
  const displayAmount = bidInput
    ? `$ ${parseInt(bidInput, 10).toLocaleString('es-AR')}`
    : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-white/50 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-white/70 p-6 text-center">
        <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-base font-medium">Subasta no disponible</p>
        <p className="text-sm mt-1 text-white/40">Esta subasta no existe o ya finalizó.</p>
      </div>
    );
  }

  const { auction, vehicle, photoUrl, minBid } = data;
  const vehicleTitle = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  const isActive = auction.status === 'active';
  const formattedInput = parsedAmount > 0 ? formatCurrency(parsedAmount) : '';
  const isBelowMin = parsedAmount > 0 && parsedAmount < minBid;
  const canSubmit = !submitting && bidderName.trim().length > 0 && parsedAmount >= minBid;

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      {/* Vehicle hero */}
      <div className="relative">
        {photoUrl ? (
          <img src={photoUrl} alt={vehicleTitle} className="w-full aspect-[16/10] object-cover" />
        ) : (
          <div className="w-full aspect-[16/10] bg-white/5 flex items-center justify-center text-white/20 text-sm">
            Sin foto
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <h1 className="text-lg font-bold leading-tight">{vehicleTitle}</h1>
          {vehicle.trim && <p className="text-xs text-white/60 mt-0.5">{vehicle.trim}</p>}
        </div>
      </div>

      {/* Bid info */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40">Oferta líder</p>
            <p className="text-xl font-bold tabular-nums text-[#00d4aa]">
              {(auction.current_high_bid || 0) > 0 ? formatCurrency(auction.current_high_bid) : 'Sin ofertas'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Mínimo válido</p>
            <p className="text-base font-bold tabular-nums text-white">{formatCurrency(minBid)}</p>
          </div>
        </div>

        {auction.bid_count > 0 && (
          <p className="text-xs text-white/40">
            📊 {auction.bid_count} oferta{auction.bid_count > 1 ? 's' : ''} recibida{auction.bid_count > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Bid form or closed state */}
      {isActive ? (
        <div className="flex-1 px-4 pb-6 flex flex-col">
          {/* Privacy badge */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 mb-4">
            <Shield className="h-4 w-4 text-[#00d4aa] shrink-0" />
            <p className="text-[11px] text-white/60">Tu oferta es privada. El grupo no verá tu identidad.</p>
          </div>

          {/* Name input */}
          <label className="text-xs text-white/50 mb-1">Tu nombre</label>
          <input
            type="text"
            value={bidderName}
            onChange={(e) => setBidderName(e.target.value)}
            className="w-full h-11 rounded-lg bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/50 focus:border-[#00d4aa]/50 mb-3"
            placeholder="Nombre o alias"
          />

          {/* Amount input with quick fill */}
          <div className="flex items-end justify-between mb-1">
            <label className="text-xs text-white/50">Monto de tu oferta (ARS)</label>
            <button
              type="button"
              onClick={handleFillMin}
              className="flex items-center gap-1 text-[11px] text-[#00d4aa] hover:text-[#00e4ba] transition font-medium"
            >
              <Zap className="h-3 w-3" />
              Ofertar mínimo
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`w-full h-12 rounded-lg bg-white/10 border px-3 text-lg font-bold tabular-nums text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/50 focus:border-[#00d4aa]/50 mb-1 transition ${
              isBelowMin ? 'border-red-400/50' : 'border-white/10'
            }`}
            placeholder={formatCurrency(minBid)}
          />

          {/* Live feedback under input */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-white/30">
              Incremento mínimo: {formatCurrency(MIN_BID_INCREMENT)}
            </p>
            {parsedAmount > 0 && (
              <p className={`text-[11px] font-medium tabular-nums ${isBelowMin ? 'text-red-400' : 'text-[#00d4aa]'}`}>
                {formattedInput}
                {isBelowMin && ' — no alcanza'}
              </p>
            )}
          </div>

          {/* Result message */}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4 text-sm ${
              result.success ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
            }`}>
              {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-lg bg-[#00d4aa] hover:bg-[#00c49a] text-[#1a1a2e] font-bold text-base transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar oferta'
            )}
          </button>

          {/* Gallery link */}
          <a
            href={`/galeria/${auctionId}`}
            className="text-center text-xs text-white/40 hover:text-white/60 mt-3 transition"
          >
            📸 Ver galería completa
          </a>
        </div>
      ) : (
        <div className="flex-1 px-4 pb-6 flex flex-col items-center justify-center text-center">
          <p className="text-base font-medium text-white/70">Esta subasta ya no está activa</p>
          <p className="text-sm text-white/40 mt-1">No se aceptan ofertas en este momento.</p>
        </div>
      )}
    </div>
  );
}
