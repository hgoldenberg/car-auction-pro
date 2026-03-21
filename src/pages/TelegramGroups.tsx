import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MobileCard, MobileCardRow } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TelegramGroupFeed } from '@/components/telegram/TelegramGroupFeed';
import { TelegramBotChat } from '@/components/telegram/TelegramBotChat';
import { Send, Hash, MessageSquare } from 'lucide-react';

export default function TelegramGroups() {
  const isMobile = useIsMobile();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [chatAuction, setChatAuction] = useState<{ id: string; title: string } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['telegram-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('telegram_groups').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handleBidClick = (auctionId: string, title: string) => {
    setChatAuction({ id: auctionId, title });
  };

  // Auto-scroll to chat on mobile when opening
  useEffect(() => {
    if (chatAuction && isMobile && chatRef.current) {
      setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [chatAuction, isMobile]);

  return (
    <AppLayout>
      <PageHeader title="Grupos Telegram" description="Grupos configurados y feed demo de publicaciones" />

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Feed Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}
          {isMobile ? (
            <div className="space-y-3">
              {groups?.map((g) => (
                <MobileCard key={g.id} onClick={() => { setSelectedGroupId(g.id); }}>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups?.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-primary" />
                          {g.name}
                        </div>
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
                      <TableCell>
                        <button
                          onClick={() => setSelectedGroupId(g.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver feed
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:h-[calc(100vh-220px)]">
            {/* Group selector + feed */}
            <div className="flex flex-col min-h-0 lg:h-full">
              <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    !selectedGroupId ? 'bg-telegram text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Hash className="h-3 w-3" /> Todos
                </button>
                {groups?.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedGroupId === g.id ? 'bg-telegram text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <Hash className="h-3 w-3" /> {g.name}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0">
                <TelegramGroupFeed
                  groupId={selectedGroupId || undefined}
                  onBidClick={handleBidClick}
                  maxHeight="100%"
                />
              </div>
            </div>

            {/* Bot chat */}
            <div className="lg:h-full flex flex-col min-h-0">
              {chatAuction ? (
                <TelegramBotChat
                  auctionId={chatAuction.id}
                  auctionTitle={chatAuction.title}
                  onClose={() => setChatAuction(null)}
                />
              ) : (
                <div className="rounded-lg border bg-telegram-bg flex flex-col items-center justify-center py-16 text-muted-foreground lg:flex-1">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Chat privado</p>
                  <p className="text-xs mt-1">Hacé clic en "Ofertar en privado" en el feed</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
