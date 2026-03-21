import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
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
import { DollarSign, Clock, Users, Send, Edit, Play, Pause, XCircle, Award, Plus, MessageSquare, BarChart3 } from 'lucide-react';
import { ACTIVITY_ACTIONS } from '@/lib/types';
import type { AuctionStatus, BidStatus, PublicationStatus } from '@/lib/types';
import { activateAuction, pauseAuction, closeAuction, awardAuction, submitBid } from '@/lib/auction-actions';
import { TelegramGroupFeed } from '@/components/telegram/TelegramGroupFeed';
import { TelegramBotChat } from '@/components/telegram/TelegramBotChat';
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

  if (!auction) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  const vehicle = (auction as any).vehicles;
  const uniqueBidders = new Set(bids?.map(b => b.lead_id)).size;
  const winningBid = bids?.find(b => b.status === 'winning');
  const leadingBid = bids?.find(b => b.status === 'leading');
  const status = auction.status as AuctionStatus;

  return (
    <AppLayout>
      <PageHeader
        title={auction.title}
        description={vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year} · ${vehicle.color || ''} · ${vehicle.km?.toLocaleString('es-AR') || '-'} km` : ''}
        actions={
          <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => navigate(`/subastas/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:gap-4 md:grid-cols-4 md:mb-6">
        <KPICard title="Estado" value={auction.status.toUpperCase()} icon={<StatusBadge status={status} />} />
        <KPICard title="Oferta líder" value={formatCurrency(auction.current_high_bid)} icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Ofertas" value={auction.bid_count || 0} icon={<Users className="h-4 w-4" />} description={`${uniqueBidders} oferentes`} />
        <KPICard title="Cierre" value={timeRemaining(auction.end_date)} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['draft', 'scheduled', 'paused'].includes(status) && (
          <Button size="sm" onClick={() => actionMutation.mutate('activate')} disabled={actionMutation.isPending}>
            <Play className="h-4 w-4 mr-1" /> Activar
          </Button>
        )}
        {status === 'active' && (
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate('pause')} disabled={actionMutation.isPending}>
            <Pause className="h-4 w-4 mr-1" /> Pausar
          </Button>
        )}
        {['active', 'paused'].includes(status) && (
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate('close')} disabled={actionMutation.isPending}>
            <XCircle className="h-4 w-4 mr-1" /> Cerrar
          </Button>
        )}
        {status === 'closed' && (
          <Button size="sm" onClick={() => actionMutation.mutate('award')} disabled={actionMutation.isPending}>
            <Award className="h-4 w-4 mr-1" /> Adjudicar
          </Button>
        )}
        {status === 'active' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowBidForm(!showBidForm)}>
              <Plus className="h-4 w-4 mr-1" /> Inyectar oferta
            </Button>
            <Button size="sm" variant="secondary" className="bg-telegram/10 text-telegram hover:bg-telegram/20" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="h-4 w-4 mr-1" /> Chat demo
            </Button>
          </>
        )}
      </div>

      {/* Dummy bid form */}
      {showBidForm && (
        <div className="rounded-lg border bg-card shadow-card p-4 mb-4 max-w-md space-y-3">
          <h3 className="text-sm font-semibold">Inyectar oferta demo</h3>
          <div className="space-y-2">
            <Label className="text-xs">Lead</Label>
            <Select value={bidLeadId} onValueChange={setBidLeadId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar lead" /></SelectTrigger>
              <SelectContent>
                {leads?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Monto (ARS)</Label>
            <Input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} className="h-9 text-sm" />
          </div>
          <Button size="sm" onClick={() => bidMutation.mutate()} disabled={!bidLeadId || !bidAmount || bidMutation.isPending}>
            Registrar oferta
          </Button>
        </div>
      )}

      {/* Tabbed content */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ranking" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Ranking
          </TabsTrigger>
          <TabsTrigger value="telegram" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5" /> Telegram
          </TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5" /> Detalle
          </TabsTrigger>
        </TabsList>

        {/* ── Ranking tab ── */}
        <TabsContent value="ranking">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="lg:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
              <div className="p-3 border-b sm:p-4">
                <h2 className="text-sm font-semibold">Ranking de ofertas</h2>
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
                return (
                  <div key={pub.id} className="p-3 flex items-center justify-between sm:p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{group?.name}</p>
                      <p className="text-xs text-muted-foreground">{pub.published_at ? formatDateTime(pub.published_at) : 'Sin publicar'}</p>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">KM</span><span className="tabular-nums">{vehicle.km?.toLocaleString('es-AR') || '-'}</span></div>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Precio reserva</span><span className="tabular-nums font-medium">{formatCurrency(auction.reserve_price)}</span></div>
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
