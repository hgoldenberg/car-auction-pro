import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import { formatCurrency } from '@/lib/formatters';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

export default function VehicleGallery() {
  const { auctionId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, images.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  // Touch swipe support
  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext();
      else goPrev();
    }
  };

  const botDeepLink = `https://t.me/SubastaPrivadaAutoDemoBot?start=${auction.id}`;

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
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={currentImage.id}
          src={imageUrl}
          alt={`${vehicleTitle} - Foto ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />

        {/* Navigation arrows - desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition disabled:opacity-20 disabled:cursor-default hidden sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
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
