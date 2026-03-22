import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TelegramMessage } from './TelegramMessage';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/formatters';

import { Bot, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';

interface TelegramGroupFeedProps {
  groupId?: string;
  auctionId?: string;
  onBidClick?: (auctionId: string, auctionTitle: string) => void;
  maxHeight?: string;
}

export function TelegramGroupFeed({ groupId, auctionId, onBidClick, maxHeight = '500px' }: TelegramGroupFeedProps) {
  const { data: publications } = useQuery({
    queryKey: ['feed-publications', groupId, auctionId],
    queryFn: async () => {
      let q = supabase
        .from('auction_group_publications')
        .select('*, telegram_groups(name), auctions(id, title, status, starting_price, current_high_bid, bid_count, end_date, vehicle_id, vehicles(make, model, year, trim, color, km))')
        .eq('status', 'posted')
        .order('published_at', { ascending: true });

      if (groupId) q = q.eq('group_id', groupId);
      if (auctionId) q = q.eq('auction_id', auctionId);

      const { data } = await q;
      return data || [];
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['feed-bids', auctionId],
    enabled: !!auctionId,
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('*, leads(full_name)')
        .eq('auction_id', auctionId!)
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  // Get vehicle IDs from publications to fetch their images
  const vehicleIds = [...new Set(
    (publications || []).map((p: any) => p.auctions?.vehicle_id).filter(Boolean)
  )];

  const { data: vehicleImagesMap } = useQuery({
    queryKey: ['feed-vehicle-images', vehicleIds.join(',')],
    enabled: vehicleIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_images')
        .select('vehicle_id, storage_path, is_main')
        .in('vehicle_id', vehicleIds)
        .order('is_main', { ascending: false });
      const map: Record<string, string> = {};
      (data || []).forEach((img: any) => {
        if (!map[img.vehicle_id]) map[img.vehicle_id] = img.storage_path;
      });
      return map;
    },
  });

  if (!publications?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Bot className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Sin publicaciones en este grupo</p>
      </div>
    );
  }

  // Build feed messages from publications + bids
  type FeedItem = { type: 'publication' | 'bid'; time: string; data: any };
  const feedItems: FeedItem[] = [];

  publications.forEach((pub) => {
    const auction = (pub as any).auctions;
    const vehicle = auction?.vehicles;
    if (!auction || !vehicle) return;
    const imgPath = vehicleImagesMap?.[auction.vehicle_id];

    feedItems.push({
      type: 'publication',
      time: pub.published_at || pub.created_at,
      data: { pub, auction, vehicle, group: (pub as any).telegram_groups, imgUrl: imgPath ? getVehicleImageUrl(imgPath) : null },
    });
  });

  if (bids) {
    bids.forEach((bid) => {
      feedItems.push({
        type: 'bid',
        time: bid.created_at,
        data: bid,
      });
    });
  }

  feedItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="bg-telegram-bg rounded-lg border overflow-hidden flex flex-col" style={{ height: maxHeight === '100%' ? '100%' : maxHeight }}>
      {/* Group header */}
      {!auctionId && publications[0] && (
        <div className="bg-telegram text-white px-4 py-2.5 flex items-center gap-2 shrink-0">
          <Hash className="h-4 w-4" />
          <span className="font-medium text-sm">{(publications[0] as any).telegram_groups?.name || 'Grupo Demo'}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {feedItems.map((item, idx) => {
            if (item.type === 'publication') {
              const { auction, vehicle, group, imgUrl } = item.data;
              const vehicleTitle = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
              const text = [
                `🚗 *SUBASTA ABIERTA*`,
                ``,
                `📋 ${vehicleTitle}`,
                vehicle.trim ? `   Versión: ${vehicle.trim}` : '',
                vehicle.color ? `   Color: ${vehicle.color}` : '',
                vehicle.km ? `   KM: ${vehicle.km.toLocaleString('es-AR')}` : '',
                ``,
                `💰 Precio inicial: ${formatCurrency(auction.starting_price)}`,
                auction.current_high_bid > 0 ? `🏆 Oferta líder: ${formatCurrency(auction.current_high_bid)}` : '',
                auction.bid_count > 0 ? `📊 Ofertas: ${auction.bid_count}` : '',
                ``,
                `⏰ Cierre: ${auction.end_date ? formatDateTime(auction.end_date) : 'Por definir'}`,
                ``,
                `💬 Para ofertar, escribí al bot en privado.`,
              ].filter(Boolean).join('\n');

              return (
                <div key={`pub-${idx}`}>
                  <TelegramMessage
                    sender="bot"
                    senderName="🤖 SubastaBot"
                    text={text}
                    time={formatDateTime(item.time)}
                    imageUrl={imgUrl}
                  >
                    {onBidClick && auction.status === 'active' && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          className="w-full bg-telegram hover:bg-telegram/90 text-white text-xs"
                          onClick={() => onBidClick(auction.id, vehicleTitle)}
                        >
                          💬 Ofertar en privado
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => window.open(`/galeria/${auction.id}`, '_blank')}
                        >
                          📸 Ver galería
                        </Button>
                      </div>
                    )}
                  </TelegramMessage>
                </div>
              );
            }

            if (item.type === 'bid') {
              const bid = item.data;
              const statusMessages: Record<string, string | null> = {
                leading: `🏆 Nueva oferta líder: ${formatCurrency(bid.amount)}\nUn oferente anónimo lidera la subasta.`,
                outbid: null,
                winning: `🎉 ¡Subasta adjudicada!\nOferta ganadora: ${formatCurrency(bid.amount)}`,
              };
              const msg = statusMessages[bid.status];
              if (!msg) return null;

              return (
                <div key={`bid-${idx}`}>
                  <TelegramMessage
                    sender="bot"
                    senderName="🤖 SubastaBot"
                    text={msg}
                    time={timeAgo(bid.created_at)}
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
