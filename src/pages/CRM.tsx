import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate, timeAgo } from '@/lib/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard } from '@/components/MobileCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { LEAD_STATUS_LABELS, LEAD_PIPELINE_COLUMNS } from '@/lib/types';
import type { LeadStatus } from '@/lib/types';
// ScrollArea removed — using native scroll for better mobile touch support

export default function CRM() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads-enriched'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*, telegram_groups(name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch latest bid per lead
  const { data: latestBids } = useQuery({
    queryKey: ['leads-latest-bids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('lead_id, amount, auction_id, auctions(title, vehicles(make, model, year))')
        .order('created_at', { ascending: false });
      // Group by lead_id, take first (latest)
      const map: Record<string, any> = {};
      data?.forEach((bid) => {
        if (!map[bid.lead_id]) map[bid.lead_id] = bid;
      });
      return map;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['telegram-groups-select'],
    queryFn: async () => {
      const { data } = await supabase.from('telegram_groups').select('id, name');
      return data || [];
    },
  });

  const filtered = leads?.filter((lead) => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (groupFilter !== 'all' && lead.origin_group_id !== groupFilter) return false;
    return true;
  });

  const filters = (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={groupFilter} onValueChange={setGroupFilter}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="Grupo origen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los grupos</SelectItem>
          {groups?.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader title="CRM" description="Gestión de leads y contactos comerciales" />

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tabla">Tabla</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla">
          {filters}
          {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}

          {isMobile ? (
            <div className="space-y-3">
              {filtered?.map((lead) => {
                const group = (lead as any).telegram_groups;
                const latestBid = latestBids?.[lead.id];
                return (
                  <MobileCard key={lead.id} onClick={() => navigate(`/crm/${lead.id}`)}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground">{group?.name || '-'}</p>
                      </div>
                      <StatusBadge status={lead.status as LeadStatus} />
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground mt-2">
                      {lead.phone && <p>{lead.phone}</p>}
                      {lead.telegram_username && <p>{lead.telegram_username}</p>}
                      {latestBid && (
                        <p className="font-medium text-foreground">
                          Última oferta: {formatCurrency(latestBid.amount)}
                        </p>
                      )}
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Grupo origen</TableHead>
                    <TableHead>Interés</TableHead>
                    <TableHead className="text-right">Última oferta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Alta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((lead) => {
                    const group = (lead as any).telegram_groups;
                    const latestBid = latestBids?.[lead.id];
                    const vehicle = latestBid?.auctions?.vehicles;
                    const interest = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : '-';
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                        onClick={() => navigate(`/crm/${lead.id}`)}
                      >
                        <TableCell className="font-medium">{lead.full_name}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{lead.phone || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.telegram_username || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{group?.name || '-'}</TableCell>
                        <TableCell>{interest}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {latestBid ? formatCurrency(latestBid.amount) : '-'}
                        </TableCell>
                        <TableCell><StatusBadge status={lead.status as LeadStatus} /></TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="overflow-visible">
          {filters}
          <div className="overflow-x-auto -mx-4 px-4 pb-4 overscroll-x-contain touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex gap-3 snap-x snap-mandatory" style={{ minWidth: LEAD_PIPELINE_COLUMNS.length * 200 }}>
              {LEAD_PIPELINE_COLUMNS.map((col) => {
                const colLeads = filtered?.filter((l) => l.status === col.status) || [];
                return (
                  <div key={col.status} className="flex-1 min-w-[160px] snap-start">
                    <div className="flex items-center gap-2 mb-2 px-1 sticky top-0">
                      <StatusBadge status={col.status as LeadStatus} />
                      <span className="text-xs text-muted-foreground tabular-nums">({colLeads.length})</span>
                    </div>
                    <div className="space-y-2">
                      {colLeads.map((lead) => {
                        const latestBid = latestBids?.[lead.id];
                        return (
                          <div
                            key={lead.id}
                            onClick={() => navigate(`/crm/${lead.id}`)}
                            className="rounded-lg border bg-card p-3 shadow-card cursor-pointer hover:border-primary/30 transition-colors duration-150"
                          >
                            <p className="text-sm font-medium truncate">{lead.full_name}</p>
                            {lead.telegram_username && (
                              <p className="text-xs text-muted-foreground truncate">{lead.telegram_username}</p>
                            )}
                            {latestBid && (
                              <p className="text-xs font-medium tabular-nums mt-1">
                                {formatCurrency(latestBid.amount)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(lead.created_at)}</p>
                          </div>
                        );
                      })}
                      {colLeads.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <p className="text-xs text-muted-foreground">Vacío</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
