import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface GroupData {
  id?: string;
  name?: string;
  chat_id?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  is_real_group?: boolean;
  notes?: string | null;
}

interface Props {
  group?: GroupData | null;
  open: boolean;
  onClose: () => void;
}

export function EditTelegramGroupDialog({ group, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const isCreate = !group?.id;

  const [name, setName] = useState('');
  const [chatId, setChatId] = useState('');
  const [description, setDescription] = useState('');
  const [isReal, setIsReal] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Reset form when group changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(group?.name || '');
      setChatId(group?.chat_id || '');
      setDescription(group?.description || '');
      setIsReal(group?.is_real_group || false);
      setIsActive(group?.is_active ?? true);
      setNotes(group?.notes || '');
    }
  }, [open, group]);

  const nameError = !name.trim();
  const chatIdError = isReal && !chatId.trim();

  const mutation = useMutation({
    mutationFn: async () => {
      if (nameError) throw new Error('El nombre es obligatorio');
      if (chatIdError) throw new Error('El Chat ID es obligatorio para grupos reales');

      const payload = {
        name: name.trim(),
        chat_id: chatId.trim() || null,
        description: description.trim() || null,
        is_real_group: isReal,
        is_active: isActive,
        notes: notes.trim() || null,
      };

      if (isCreate) {
        // Check duplicate chat_id
        if (payload.chat_id) {
          const { data: existing } = await supabase
            .from('telegram_groups')
            .select('id')
            .eq('chat_id', payload.chat_id)
            .maybeSingle();
          if (existing) throw new Error('Ya existe un grupo con ese Chat ID');
        }
        const { error } = await supabase.from('telegram_groups').insert(payload);
        if (error) throw error;
      } else {
        // Check duplicate chat_id (excluding self)
        if (payload.chat_id) {
          const { data: existing } = await supabase
            .from('telegram_groups')
            .select('id')
            .eq('chat_id', payload.chat_id)
            .neq('id', group!.id!)
            .maybeSingle();
          if (existing) throw new Error('Ya existe un grupo con ese Chat ID');
        }
        const { error } = await supabase
          .from('telegram_groups')
          .update(payload)
          .eq('id', group!.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-groups'] });
      queryClient.invalidateQueries({ queryKey: ['telegram-groups-select'] });
      toast.success(isCreate ? 'Grupo creado' : 'Grupo actualizado');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Nuevo grupo Telegram' : `Editar ${group?.name}`}</DialogTitle>
          <DialogDescription>
            {isCreate ? 'Configurá los datos del nuevo grupo' : 'Modificá los datos del grupo'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Subastas Premium BA"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Chat ID {isReal && '*'}
            </Label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Ej: -1001234567890"
              className="font-mono text-sm rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Chat ID numérico del grupo. Podés obtenerlo con @RawDataBot.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve del grupo"
              className="rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Grupo real</Label>
              <p className="text-xs text-muted-foreground">Publicación real vía Bot API</p>
            </div>
            <Switch checked={isReal} onCheckedChange={setIsReal} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Activo</Label>
              <p className="text-xs text-muted-foreground">Incluir en publicaciones</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas opcionales"
              className="text-sm rounded-lg"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            className="rounded-lg"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || nameError}
          >
            {mutation.isPending ? 'Guardando...' : isCreate ? 'Crear grupo' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
