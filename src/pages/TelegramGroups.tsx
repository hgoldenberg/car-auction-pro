import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MobileCard, MobileCardRow } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send } from 'lucide-react';

export default function TelegramGroups() {
  const isMobile = useIsMobile();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['telegram-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('telegram_groups').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AppLayout>
      <PageHeader title="Grupos Telegram" description="Grupos configurados para publicación de subastas" />

      {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}

      {isMobile ? (
        <div className="space-y-3">
          {groups?.map((g) => (
            <MobileCard key={g.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-medium text-sm">{g.name}</p>
                </div>
                <Badge variant={g.is_active ? 'default' : 'secondary'}
                  className={g.is_active ? 'bg-status-success-bg text-status-success border-0' : ''}>
                  {g.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              {g.description && <p className="text-xs text-muted-foreground mb-2">{g.description}</p>}
              <MobileCardRow label="Miembros">{g.member_count?.toLocaleString('es-AR')}</MobileCardRow>
            </MobileCard>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Chat ID</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Miembros</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups?.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    {g.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{g.chat_id}</TableCell>
                  <TableCell className="text-muted-foreground">{g.description}</TableCell>
                  <TableCell className="text-center tabular-nums">{g.member_count?.toLocaleString('es-AR')}</TableCell>
                  <TableCell>
                    <Badge variant={g.is_active ? 'default' : 'secondary'}
                      className={g.is_active ? 'bg-status-success-bg text-status-success border-0' : ''}>
                      {g.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
