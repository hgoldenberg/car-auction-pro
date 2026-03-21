import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  group: {
    id: string;
    name: string;
    chat_id: string | null;
    is_active: boolean | null;
    is_real_group?: boolean;
    notes?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export function EditTelegramGroupDialog({ group, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState(group.chat_id || '');
  const [isReal, setIsReal] = useState(group.is_real_group || false);
  const [isActive, setIsActive] = useState(group.is_active ?? true);
  const [notes, setNotes] = useState(group.notes || '');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('telegram_groups')
        .update({
          chat_id: chatId || null,
          is_real_group: isReal,
          is_active: isActive,
          notes: notes || null,
        })
        .eq('id', group.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-groups'] });
      toast.success('Grupo actualizado');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {group.name}</DialogTitle>
          <DialogDescription>Configurá el chat_id real y el estado del grupo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Chat ID de Telegram</Label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="font-mono text-sm rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Usá el chat_id numérico del grupo (ej: -1001234567890). Podés obtenerlo con @RawDataBot.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Grupo real</Label>
              <p className="text-xs text-muted-foreground">Habilitar publicación real vía Bot API</p>
            </div>
            <Switch checked={isReal} onCheckedChange={setIsReal} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Activo</Label>
              <p className="text-xs text-muted-foreground">Incluir en publicaciones automáticas</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm rounded-lg"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="rounded-lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
