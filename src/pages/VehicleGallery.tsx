import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import { formatCurrency } from '@/lib/formatters';
import { ChevronLeft, ChevronRight, Camera, X, ZoomIn } from 'lucide-react';

export default function VehicleGallery() {
  const { auctionId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef({ startDist: 0, startScale: 1 });
  const panRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0, isPanning: false });
  const touchStartX = useRef(0);

  // Record gallery view once on mount
  const viewRecorded = useRef(false);
  useEffect(() => {
    if (!auctionId || viewRecorded.current) return;
    viewRecorded.current = true;
    supabase.from('gallery_views').insert({
      auction_id: auctionId,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    } as any).then(() => {});
  }, [auctionId]);

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', auctionId],
    queryFn: async () => {
      const { data: auction } = await supabase
        .from('auctions')
        .select('id, title, starting_price, current_high_bid, status, vehicles(id, make, model, year, trim, color, km)')
        .eq('id', auctionId!)
        .single();
      if (!auction) return null;

      const vehicle = (auction as any).vehicles;
      if (!vehicle) return null;

      const { data: images } = await supabase
        .from('vehicle_images')
        .select('id, storage_path, is_main, display_order')
        .eq('vehicle_id', vehicle.id)
        .order('is_main', { ascending: false })
        .order('display_order');

      return { auction, vehicle, images: images || [] };
    },
  });

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, (data?.images.length || 1) - 1));
    resetZoom();
  }, [data, resetZoom]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    resetZoom();
  }, [resetZoom]);

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
    resetZoom();
  }, [resetZoom]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    resetZoom();
  }, [resetZoom]);

  // Swipe handler for gallery navigation (non-fullscreen or fullscreen at scale=1)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { startDist: dist, startScale: scale };
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    if (scale > 1) {
      panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, lastX: translate.x, lastY: translate.y, isPanning: true };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(4, Math.max(1, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      setScale(newScale);
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      return;
    }
    if (scale > 1 && panRef.current.isPanning) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({ x: panRef.current.lastX + dx, y: panRef.current.lastY + dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    panRef.current.isPanning = false;
    if (scale <= 1) {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) > 50) {
        if (delta < 0) goNext();
        else goPrev();
      }
    }
    if (scale < 1.1) resetZoom();
  };

  const handleDoubleClick = () => {
    if (fullscreen) {
      if (scale > 1) resetZoom();
      else { setScale(2.5); setTranslate({ x: 0, y: 0 }); }
    } else {
      openFullscreen();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/50 text-sm">Cargando galería...</div>
      </div>
    );
  }

  if (!data || data.images.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white/70 p-6">
        <Camera className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Sin imágenes disponibles</p>
        <p className="text-sm mt-1">Este vehículo no tiene fotos cargadas</p>
      </div>
    );
  }

  const { auction, vehicle, images } = data;
  const vehicleTitle = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  const currentImage = images[currentIndex];
  const imageUrl = getVehicleImageUrl(currentImage.storage_path);
  const botDeepLink = `https://t.me/SubastaPrivadaAutoDemoBot?start=${auction.id}`;

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10">
          <span className="text-xs text-white/50 tabular-nums">{currentIndex + 1} / {images.length}</span>
          <button onClick={closeFullscreen} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Zoomable image */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <img
            key={currentImage.id}
            src={imageUrl}
            alt={`${vehicleTitle} - Foto ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-100"
            style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)` }}
            draggable={false}
          />

          {/* Desktop arrows */}
          {images.length > 1 && scale <= 1 && (
            <>
              <button onClick={goPrev} disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition disabled:opacity-20 hidden sm:flex">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={goNext} disabled={currentIndex === images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition disabled:opacity-20 hidden sm:flex">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
            {images.map((_, i) => (
              <button key={i} onClick={() => { setCurrentIndex(i); resetZoom(); }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Normal gallery view
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-black/80 backdrop-blur-sm border-b border-white/10 shrink-0 z-10">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{vehicleTitle}</h1>
          {vehicle.trim && <p className="text-xs text-white/50 truncate">{vehicle.trim}</p>}
        </div>
        <span className="text-xs text-white/40 tabular-nums shrink-0 ml-2">
          {currentIndex + 1} / {images.length}
        </span>
      </header>

      {/* Image viewer */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none cursor-zoom-in"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={openFullscreen}
      >
        <img
          key={currentImage.id}
          src={imageUrl}
          alt={`${vehicleTitle} - Foto ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/50">
          <ZoomIn className="h-4 w-4" />
        </div>

        {/* Navigation arrows - desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition disabled:opacity-20 disabled:cursor-default hidden sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              disabled={currentIndex === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition disabled:opacity-20 disabled:cursor-default hidden sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 shrink-0">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto shrink-0">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                i === currentIndex ? 'border-white' : 'border-transparent opacity-50'
              }`}
            >
              <img
                src={getVehicleImageUrl(img.storage_path)}
                alt={`Miniatura ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Bottom bar with info + CTA */}
      <div className="px-4 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {vehicle.km && <span className="text-white/60">📏 {vehicle.km.toLocaleString('es-AR')} km</span>}
            {vehicle.color && <span className="text-white/60">🎨 {vehicle.color}</span>}
          </div>
          {auction.current_high_bid > 0 && (
            <span className="text-white/80 font-medium tabular-nums">
              🏆 {formatCurrency(auction.current_high_bid)}
            </span>
          )}
        </div>
        {auction.status === 'active' && (
          <a
            href={botDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-lg bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-medium transition"
          >
            💬 Ofertar en privado
          </a>
        )}
      </div>
    </div>
  );
}
