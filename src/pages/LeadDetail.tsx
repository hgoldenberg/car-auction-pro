import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { Phone, Mail, MapPin, MessageSquare, Send, Plus } from 'lucide-react';
import { LEAD_STATUS_LABELS, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/types';
import type { LeadStatus, BidStatus } from '@/lib/types';
import { changeLeadStatus, addLeadNote } from '@/lib/auction-actions';
import { toast } from 'sonner';

const quickStatuses: LeadStatus[] = ['interested', 'finalist', 'follow_up', 'lost', 'closed'];

export default function LeadDetail() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*, telegram_groups(name)')
        .eq('id', id!)
        .single();
      return data;
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['lead-bids', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('*, auctions(title, status, vehicles(make, model, year))')
        .eq('lead_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['lead-notes', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['lead-activity', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: LeadStatus) => changeLeadStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-activity', id] });
      toast.success('Estado actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMutation = useMutation({
    mutationFn: () => addLeadNote(id!, noteContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-activity', id] });
      setNoteContent('');
      toast.success('Nota agregada');
    },
    onError: () => toast.error('Error al agregar nota'),
  });

  if (!lead) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  const group = (lead as any).telegram_groups;
  const totalBidAmount = bids?.reduce((sum, b) => sum + b.amount, 0) || 0;

  return (
    <AppLayout>
      <PageHeader
        title={lead.full_name}
        description={group?.name ? `Origen: ${group.name}` : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left column: Info + Status + Notes */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-lg border bg-card shadow-card p-4 space-y-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Información</h2>
              <StatusBadge status={lead.status as LeadStatus} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" /> {lead.phone || '-'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{lead.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4 shrink-0" /> {lead.telegram_username || '-'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" /> {lead.city || '-'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-4 w-4 shrink-0" /> {group?.name || '-'}
              </div>
            </div>
            <div className="pt-3 border-t grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Alta</p>
                <p className="tabular-nums">{formatDateTime(lead.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ofertas totales</p>
                <p className="tabular-nums font-medium">{formatCurrency(totalBidAmount)}</p>
              </div>
            </div>
          </div>

          {/* Quick status */}
          <div className="rounded-lg border bg-card shadow-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-3">Cambiar estado</h2>
            <div className="flex flex-wrap gap-2">
              {quickStatuses.map((s) => (
                <Button
                  key={s}
                  variant={lead.status === s ? 'default' : 'outline'}
                  size="sm"
                  disabled={statusMutation.isPending || lead.status === s}
                  onClick={() => statusMutation.mutate(s)}
                >
                  {LEAD_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border bg-card shadow-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-3">Notas</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); if (noteContent.trim()) noteMutation.mutate(); }}
              className="flex gap-2 mb-4"
            >
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="min-h-[60px] text-sm"
                rows={2}
              />
              <Button type="submit" size="icon" className="shrink-0 self-end" disabled={!noteContent.trim() || noteMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            <div className="space-y-3">
              {notes?.map((note) => (
                <div key={note.id} className="text-sm">
                  <p>{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(note.created_at)}</p>
                </div>
              ))}
              {notes?.length === 0 && <p className="text-sm text-muted-foreground">Sin notas</p>}
            </div>
          </div>
        </div>

        {/* Right column: Bids + Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bids history */}
          <div className="rounded-lg border bg-card shadow-card overflow-hidden">
            <div className="p-3 border-b sm:p-4">
              <h2 className="text-sm font-semibold">Historial de ofertas ({bids?.length || 0})</h2>
            </div>
            {isMobile ? (
              <div className="divide-y">
                {bids?.map((bid) => {
                  const auction = (bid as any).auctions;
                  const vehicle = auction?.vehicles;
                  return (
                    <div key={bid.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : auction?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(bid.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">{formatCurrency(bid.amount)}</p>
                        <StatusBadge status={bid.status as BidStatus} />
                      </div>
                    </div>
                  );
                })}
                {bids?.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">Sin ofertas</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Subasta</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado oferta</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bids?.map((bid) => {
                    const auction = (bid as any).auctions;
                    const vehicle = auction?.vehicles;
                    return (
                      <TableRow key={bid.id}>
                        <TableCell className="font-medium text-sm">
                          {vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{auction?.title}</TableCell>
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

          {/* Activity timeline */}
          <div className="rounded-lg border bg-card shadow-card">
            <div className="p-3 border-b sm:p-4">
              <h2 className="text-sm font-semibold">Timeline de actividad</h2>
            </div>
            <div className="divide-y">
              {activity?.map((entry) => (
                <div key={entry.id} className="p-3 flex items-start gap-3 sm:p-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(entry.created_at)}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{ACTIVITY_ACTIONS[entry.action] || entry.action}</span>
                    </div>
                  </div>
                </div>
              ))}
              {activity?.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sin actividad registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
