import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import type { LeadStatus } from '@/lib/types';

export default function CRM() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AppLayout>
      <PageHeader title="CRM" description="Gestión de leads y contactos comerciales" />

      {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}

      {isMobile ? (
        <div className="space-y-3">
          {leads?.map((lead) => (
            <MobileCard key={lead.id} onClick={() => navigate(`/crm/${lead.id}`)}>
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-sm">{lead.full_name}</p>
                <StatusBadge status={lead.status as LeadStatus} />
              </div>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {lead.phone && <p>{lead.phone}</p>}
                {lead.city && <p>{lead.city}</p>}
                {lead.telegram_username && <p>{lead.telegram_username}</p>}
              </div>
            </MobileCard>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                  onClick={() => navigate(`/crm/${lead.id}`)}
                >
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.telegram_username}</TableCell>
                  <TableCell>{lead.city}</TableCell>
                  <TableCell><StatusBadge status={lead.status as LeadStatus} /></TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
