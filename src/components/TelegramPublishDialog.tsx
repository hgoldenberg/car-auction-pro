import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { publishToTelegramReal } from '@/lib/telegram-publish';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  auctionId: string;
  auctionTitle: string;
  auctionStatus: string;
}

export function TelegramPublishDialog({ auctionId, auctionTitle, auctionStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Array<{ group_name: string; success: boolean; error?: string }> | null>(null);
  const queryClient = useQueryClient();

  const { data: realGroups, isLoading } = useQuery({
    queryKey: ['real-telegram-groups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('telegram_groups')
        .select('*')
        .eq('is_active', true)
        .eq('is_real_group', true)
        .order('name');
      return data || [];
    },
    enabled: open,
  });

  // Check existing real publications for this auction
  const { data: existingPubs } = useQuery({
    queryKey: ['existing-real-pubs', auctionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('auction_group_publications')
        .select('group_id, status, publication_type')
        .eq('auction_id', auctionId)
        .eq('publication_type', 'real');
      return data || [];
    },
    enabled: open,
  });

  const publishedGroupIds = new Set(existingPubs?.filter(p => p.status === 'posted').map(p => p.group_id) || []);

  const publishMutation = useMutation({
    mutationFn: () => publishToTelegramReal(auctionId, selectedIds),
    onSuccess: (data) => {
      setResults(data.results);
      if (data.published > 0) {
        toast.success(`Publicado en ${data.published} grupo(s)`);
      }
      if (data.failed > 0) {
        toast.error(`Falló en ${data.failed} grupo(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['auction-publications', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-activity', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['existing-real-pubs', auctionId] });
      setSelectedIds([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canPublish = auctionStatus === 'active';

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResults(null); setSelectedIds([]); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-lg gap-1.5 bg-telegram hover:bg-telegram/90 text-white" disabled={!canPublish}>
          <Send className="h-4 w-4" /> Publicar en Telegram
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-telegram" /> Publicar en Telegram
          </DialogTitle>
          <DialogDescription>
            Seleccioná los grupos reales donde publicar "{auctionTitle}"
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3 py-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className="font-medium">{r.group_name}</span>
                {r.error && <span className="text-xs text-muted-foreground truncate">— {r.error}</span>}
              </div>
            ))}
            <DialogFooter>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setResults(null); setOpen(false); }}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {isLoading && <p className="py-4 text-sm text-muted-foreground text-center">Cargando grupos...</p>}

            {!isLoading && (!realGroups || realGroups.length === 0) && (
              <p className="py-4 text-sm text-muted-foreground text-center">
                No hay grupos reales configurados. Marcá un grupo como "real" y agregá su chat_id en la sección Grupos Telegram.
              </p>
            )}

            {realGroups && realGroups.length > 0 && (
              <div className="space-y-2 py-2">
                {realGroups.map((g) => {
                  const alreadyPublished = publishedGroupIds.has(g.id);
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.includes(g.id)
                          ? alreadyPublished ? 'bg-amber-50 border-amber-300' : 'bg-telegram/5 border-telegram/30'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.includes(g.id)}
                        onCheckedChange={() => toggle(g.id)}
                        disabled={!g.chat_id}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.chat_id || 'Sin chat_id'}</p>
                      </div>
                      {alreadyPublished && (
                        <Badge variant="outline" className="text-xs shrink-0 border-amber-400 text-amber-700">Republicar</Badge>
                      )}
                      {!g.chat_id && (
                        <Badge variant="destructive" className="text-xs shrink-0">Sin ID</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button
                size="sm"
                className="rounded-lg bg-telegram hover:bg-telegram/90 text-white gap-1.5"
                disabled={selectedIds.length === 0 || publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Publicar ({selectedIds.length})</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
