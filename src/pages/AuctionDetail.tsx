import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';

import { StatusBadge } from '@/components/StatusBadge';
import { KPICard } from '@/components/KPICard';
import { formatCurrency, formatDateTime, timeRemaining, timeAgo } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { DollarSign, Clock, Users, Send, Edit, Play, Pause, XCircle, Award, Plus, MessageSquare, BarChart3, AlertTriangle } from 'lucide-react';
import { TelegramPublishDialog } from '@/components/TelegramPublishDialog';
import { ACTIVITY_ACTIONS } from '@/lib/types';
import type { AuctionStatus, BidStatus, PublicationStatus } from '@/lib/types';
import { activateAuction, pauseAuction, closeAuction, awardAuction, submitBid } from '@/lib/auction-actions';
import { TelegramGroupFeed } from '@/components/telegram/TelegramGroupFeed';
import { TelegramBotChat } from '@/components/telegram/TelegramBotChat';
import { useVehicleImages, getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import { toast } from 'sonner';

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [showBidForm, setShowBidForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [bidLeadId, setBidLeadId] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['auction', id] });
    queryClient.invalidateQueries({ queryKey: ['auction-bids', id] });
    queryClient.invalidateQueries({ queryKey: ['auction-activity', id] });
    queryClient.invalidateQueries({ queryKey: ['auction-publications', id] });
    queryClient.invalidateQueries({ queryKey: ['feed-publications'] });
    queryClient.invalidateQueries({ queryKey: ['feed-bids', id] });
  };

  const { data: auction } = useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, vehicles(make, model, year, trim, color, km, status, fuel_type, transmission, doors)')
        .eq('id', id!)
        .single();
      return data;
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['auction-bids', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('*, leads(full_name, telegram_username)')
        .eq('auction_id', id!)
        .order('amount', { ascending: false });
      return data || [];
    },
  });

  const { data: publications } = useQuery({
    queryKey: ['auction-publications', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auction_group_publications')
        .select('*, telegram_groups(name)')
        .eq('auction_id', id!);
      return data || [];
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['auction-activity', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_id', id!)
        .order('created_at', { ascending: false })
        .limit(15);
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-for-bid'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('id, full_name').order('full_name');
      return data || [];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case 'activate': return activateAuction(id!);
        case 'pause': return pauseAuction(id!);
        case 'close': return closeAuction(id!);
        case 'award': return awardAuction(id!);
        default: throw new Error('Acción desconocida');
      }
    },
    onSuccess: () => { invalidateAll(); toast.success('Acción ejecutada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bidMutation = useMutation({
    mutationFn: () => submitBid(id!, bidLeadId, Number(bidAmount)),
    onSuccess: () => {
      invalidateAll();
      setShowBidForm(false);
      setBidLeadId('');
      setBidAmount('');
      toast.success('Oferta registrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { images: vehicleImages, mainImage: vehicleMainImage } = useVehicleImages(auction?.vehicle_id);

  if (!auction) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  const vehicle = (auction as any).vehicles;
  const uniqueBidders = new Set(bids?.map(b => b.lead_id)).size;
  const winningBid = bids?.find(b => b.status === 'winning');
  const leadingBid = bids?.find(b => b.status === 'leading');
  const status = auction.status as AuctionStatus;
  const mainImageUrl = vehicleMainImage ? getVehicleImageUrl(vehicleMainImage.storage_path) : null;

  return (
    <AppLayout>
      {/* ── Hero header ── */}
      <div className="pb-4 sm:pb-6">
        {/* Mobile: stacked layout */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Image + badge */}
            {mainImageUrl ? (
              <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-muted shadow-card -mx-1">
                <img src={mainImageUrl} alt={auction.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <StatusBadge status={status} />
                </div>
                {winningBid && (
                  <span className="absolute top-2 right-2 text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded">🏆 Adjudicada</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-4">
                <AlertTriangle className="h-5 w-5 text-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">Sin foto principal</span>
                <div className="ml-auto"><StatusBadge status={status} /></div>
              </div>
            )}

            {/* Title + vehicle info */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold tracking-tight leading-tight">{auction.title}</h1>
                {vehicle && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {vehicle.make} {vehicle.model} {vehicle.year} · {vehicle.color || ''} · {vehicle.km ? `${vehicle.km.toLocaleString('es-AR')} km` : ''}
                  </p>
                )}
              </div>
              <Button variant="outline" size="icon" className="rounded-lg shrink-0 h-9 w-9" onClick={() => navigate(`/subastas/${id}/editar`)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* Key metrics inline */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Líder</span>
                <p className="font-semibold tabular-nums text-primary">{formatCurrency(auction.current_high_bid)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Ofertas</span>
                <p className="font-semibold tabular-nums">{auction.bid_count || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Cierre</span>
                <p className="font-semibold tabular-nums">{timeRemaining(auction.end_date)}</p>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop: horizontal layout */
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-start">
              {mainImageUrl ? (
                <div className="shrink-0 w-28 h-28 rounded-xl overflow-hidden border bg-muted shadow-card">
                  <img src={mainImageUrl} alt={auction.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="shrink-0 w-28 h-28 rounded-xl border bg-muted/50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={status} />
                  {winningBid && <span className="text-xs font-medium text-primary">🏆 Adjudicada</span>}
                </div>
                <h1 className="text-xl font-bold tracking-tight leading-tight truncate">{auction.title}</h1>
                {vehicle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {vehicle.make} {vehicle.model} {vehicle.year} · {vehicle.color || ''} · {vehicle.km ? `${vehicle.km.toLocaleString('es-AR')} km` : ''}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="font-semibold tabular-nums text-primary">{formatCurrency(auction.current_high_bid)}</span>
                  <span className="text-muted-foreground tabular-nums">{auction.bid_count || 0} ofertas</span>
                  <span className="text-muted-foreground tabular-nums">{timeRemaining(auction.end_date)}</span>
                </div>
              </div>
              <Button variant="outline" size="icon" className="rounded-lg shrink-0 h-9 w-9" onClick={() => navigate(`/subastas/${id}/editar`)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* Gallery strip */}
            {vehicleImages.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mt-1">
                {vehicleImages.filter(i => !i.is_main).slice(0, 6).map(img => (
                  <img
                    key={img.id}
                    src={getVehicleImageUrl(img.storage_path)}
                    alt="Galería"
                    className="h-14 w-20 rounded-lg object-cover shrink-0 border hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </div>
            )}

            {!mainImageUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                <span>Sin foto principal — las publicaciones se mostrarán sin imagen.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4 sm:gap-3 sm:mb-5">
        <KPICard title="Inicio" value={formatCurrency(auction.starting_price)} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <KPICard title="Líder" value={formatCurrency(auction.current_high_bid)} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <KPICard title="Ofertas" value={auction.bid_count || 0} icon={<Users className="h-3.5 w-3.5" />} description={`${uniqueBidders} oferentes`} />
        <KPICard title="Cierre" value={timeRemaining(auction.end_date)} icon={<Clock className="h-3.5 w-3.5" />} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['draft', 'scheduled', 'paused'].includes(status) && (
          <Button size="sm" className="rounded-lg" onClick={() => actionMutation.mutate('activate')} disabled={actionMutation.isPending}>
            <Play className="h-4 w-4 mr-1" /> Activar
          </Button>
        )}
        {status === 'active' && (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => actionMutation.mutate('pause')} disabled={actionMutation.isPending}>
            <Pause className="h-4 w-4 mr-1" /> Pausar
          </Button>
        )}
        {['active', 'paused'].includes(status) && (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => actionMutation.mutate('close')} disabled={actionMutation.isPending}>
            <XCircle className="h-4 w-4 mr-1" /> Cerrar
          </Button>
        )}
        {status === 'closed' && (
          <Button size="sm" className="rounded-lg" onClick={() => actionMutation.mutate('award')} disabled={actionMutation.isPending}>
            <Award className="h-4 w-4 mr-1" /> Adjudicar
          </Button>
        )}
        {status === 'active' && (
          <>
            <TelegramPublishDialog auctionId={id!} auctionTitle={auction.title} auctionStatus={status} />
            <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => setShowBidForm(!showBidForm)}>
              <Plus className="h-4 w-4 mr-1" /> Inyectar oferta
            </Button>
            <Button size="sm" variant="secondary" className="rounded-lg bg-telegram/10 text-telegram hover:bg-telegram/20" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="h-4 w-4 mr-1" /> Chat demo
            </Button>
          </>
        )}
      </div>

      {/* Dummy bid form */}
      {showBidForm && (
        <div className="rounded-xl border bg-card shadow-elevated p-5 mb-5 max-w-md space-y-4">
          <h3 className="text-sm font-semibold">Inyectar oferta demo</h3>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lead</Label>
            <Select value={bidLeadId} onValueChange={setBidLeadId}>
              <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue placeholder="Seleccionar lead" /></SelectTrigger>
              <SelectContent>
                {leads?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Monto (ARS)</Label>
            <Input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} className="h-10 text-sm rounded-lg" />
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => bidMutation.mutate()} disabled={!bidLeadId || !bidAmount || bidMutation.isPending}>
            Registrar oferta
          </Button>
        </div>
      )}

      {/* Tabbed content */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="ranking" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Ranking
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
            <Send className="h-3.5 w-3.5" /> Telegram
          </TabsTrigger>
          <TabsTrigger value="detail" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
            <DollarSign className="h-3.5 w-3.5" /> Detalle
          </TabsTrigger>
        </TabsList>

        {/* ── Ranking tab ── */}
        <TabsContent value="ranking">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="lg:col-span-2 section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">Ranking de ofertas</h2>
              </div>
              {isMobile ? (
                <div className="divide-y">
                  {bids?.map((bid, idx) => {
                    const lead = (bid as any).leads;
                    return (
                      <div key={bid.id} className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground w-5 text-center">#{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{lead?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{lead?.telegram_username} · {timeAgo(bid.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium tabular-nums">{formatCurrency(bid.amount)}</p>
                          <StatusBadge status={bid.status as BidStatus} />
                        </div>
                      </div>
                    );
                  })}
                  {bids?.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Sin ofertas</p>}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Ofertante</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids?.map((bid, idx) => {
                      const lead = (bid as any).leads;
                      return (
                        <TableRow key={bid.id}>
                          <TableCell className="tabular-nums text-muted-foreground font-medium">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{lead?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{lead?.telegram_username}</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{formatCurrency(bid.amount)}</TableCell>
                          <TableCell><StatusBadge status={bid.status as BidStatus} /></TableCell>
                          <TableCell className="tabular-nums text-muted-foreground text-sm">{timeAgo(bid.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {bids?.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Sin ofertas</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Activity sidebar */}
            <div className="space-y-4">
              {/* CRM related leads */}
              {bids && bids.length > 0 && (
                <div className="rounded-lg border bg-card shadow-card">
                  <div className="p-3 border-b sm:p-4">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" /> Oferentes
                    </h2>
                  </div>
                  <div className="divide-y">
                    {Array.from(new Map(bids.map(b => [b.lead_id, b])).values()).map((bid) => {
                      const lead = (bid as any).leads;
                      return (
                        <div
                          key={bid.lead_id}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/crm/${bid.lead_id}`)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{lead?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{lead?.telegram_username}</p>
                          </div>
                          <StatusBadge status={bid.status as BidStatus} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity */}
              <div className="rounded-lg border bg-card shadow-card">
                <div className="p-3 border-b sm:p-4">
                  <h2 className="text-sm font-semibold">Actividad</h2>
                </div>
                <div className="divide-y">
                  {activity?.map((entry) => (
                    <div key={entry.id} className="p-3 sm:p-4">
                      <p className="text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(entry.created_at)} · {ACTIVITY_ACTIONS[entry.action] || entry.action}</p>
                    </div>
                  ))}
                  {activity?.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">Sin actividad</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Telegram tab ── */}
        <TabsContent value="telegram">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Feed */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Send className="h-4 w-4 text-telegram" /> Feed del grupo
              </h3>
              <TelegramGroupFeed
                auctionId={id}
                onBidClick={() => setShowChat(true)}
                maxHeight="500px"
              />
            </div>

            {/* Bot chat */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-telegram" /> Chat privado demo
              </h3>
              {showChat || status === 'active' ? (
                <TelegramBotChat
                  auctionId={id!}
                  auctionTitle={vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction.title}
                  onClose={() => setShowChat(false)}
                />
              ) : (
                <div className="rounded-lg border bg-telegram-bg flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Chat privado</p>
                  <p className="text-xs mt-1">
                    Disponible cuando la subasta esté activa
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Publications table */}
          <div className="mt-4 rounded-lg border bg-card shadow-card">
            <div className="p-3 border-b sm:p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4" /> Publicaciones
              </h2>
            </div>
            <div className="divide-y">
              {publications?.map((pub) => {
                const group = (pub as any).telegram_groups;
                const isReal = (pub as any).publication_type === 'real';
                return (
                  <div key={pub.id} className="p-3 flex items-center justify-between sm:p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {group?.name}
                        {isReal && <span className="ml-1.5 text-xs text-telegram font-normal">· Real</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pub.published_at ? formatDateTime(pub.published_at) : 'Sin publicar'}
                        {(pub as any).external_message_id && ` · msg#${(pub as any).external_message_id}`}
                      </p>
                      {(pub as any).error_message && (
                        <p className="text-xs text-destructive mt-0.5">{(pub as any).error_message}</p>
                      )}
                    </div>
                    <StatusBadge status={pub.status as PublicationStatus} />
                  </div>
                );
              })}
              {publications?.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sin publicaciones — activa la subasta para publicar automáticamente</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Detail tab ── */}
        <TabsContent value="detail">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Vehicle summary */}
            {vehicle && (
              <div className="rounded-lg border bg-card shadow-card p-4 sm:p-5">
                <h2 className="text-sm font-semibold mb-3">Vehículo</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Marca/Modelo</span><span className="font-medium">{vehicle.make} {vehicle.model}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Año</span><span className="tabular-nums">{vehicle.year}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Versión</span><span>{vehicle.trim || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Color</span><span>{vehicle.color || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">KM</span><span className="tabular-nums">{vehicle.km ? vehicle.km.toLocaleString('es-AR') : '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Combustible</span><span>{vehicle.fuel_type || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transmisión</span><span>{vehicle.transmission || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><StatusBadge status={vehicle.status} /></div>
                </div>
              </div>
            )}

            {/* Auction summary */}
            <div className="rounded-lg border bg-card shadow-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold mb-3">Resumen ejecutivo</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Precio inicial</span><span className="tabular-nums font-medium">{formatCurrency(auction.starting_price)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Oferta líder</span><span className="tabular-nums font-medium text-primary">{formatCurrency(auction.current_high_bid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ofertas</span><span className="tabular-nums">{auction.bid_count || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Oferentes</span><span className="tabular-nums">{uniqueBidders}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Grupos publicados</span><span className="tabular-nums">{publications?.filter(p => p.status === 'posted').length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Inicio</span><span className="tabular-nums">{formatDateTime(auction.start_date)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cierre</span><span className="tabular-nums">{formatDateTime(auction.end_date)}</span></div>
                {(winningBid || leadingBid) && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground font-medium">{winningBid ? '🏆 Ganador' : '👑 Líder'}</span>
                    <span className="font-medium text-primary">
                      {((winningBid || leadingBid) as any)?.leads?.full_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
