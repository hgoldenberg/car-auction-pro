import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Phone, Mail, MapPin, MessageSquare } from 'lucide-react';
import type { LeadStatus, BidStatus } from '@/lib/types';

export default function LeadDetail() {
  const { id } = useParams();
  const isMobile = useIsMobile();

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', id!).single();
      return data;
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['lead-bids', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('*, auctions(title, status)')
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

  if (!lead) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title={lead.full_name} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
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
          </div>

          {/* Notes */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">Notas</h3>
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

        {/* Bids history */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="p-3 border-b sm:p-4">
            <h2 className="text-sm font-semibold">Historial de ofertas</h2>
          </div>
          {isMobile ? (
            <div className="divide-y">
              {bids?.map((bid) => {
                const auction = (bid as any).auctions;
                return (
                  <div key={bid.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{auction?.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(bid.created_at)}</p>
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
                  <TableHead>Subasta</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids?.map((bid) => {
                  const auction = (bid as any).auctions;
                  return (
                    <TableRow key={bid.id}>
                      <TableCell className="font-medium text-sm">{auction?.title}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatCurrency(bid.amount)}</TableCell>
                      <TableCell><StatusBadge status={bid.status as BidStatus} /></TableCell>
                      <TableCell className="tabular-nums text-muted-foreground text-sm">{formatDateTime(bid.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
                {bids?.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sin ofertas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
