import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TelegramMessage } from './TelegramMessage';
import { formatCurrency } from '@/lib/formatters';
import { submitBid } from '@/lib/auction-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

interface TelegramBotChatProps {
  auctionId: string;
  auctionTitle: string;
  onClose?: () => void;
}

export function TelegramBotChat({ auctionId, auctionTitle, onClose }: TelegramBotChatProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [awaitingLead, setAwaitingLead] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLeadName, setSelectedLeadName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: auction } = useQuery({
    queryKey: ['chat-auction', auctionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, vehicles(make, model, year, trim, km, color)')
        .eq('id', auctionId)
        .single();
      return data;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ['chat-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('id, full_name, telegram_username').order('full_name');
      return data || [];
    },
  });

  const now = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const addBotMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'bot', text, time: now() }]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'user', text, time: now() }]);
  };

  // Initial greeting
  useEffect(() => {
    if (!auction) return;
    const vehicle = (auction as any).vehicles;
    if (!vehicle) return;

    const greeting = [
      `👋 ¡Hola! Soy SubastaBot.`,
      ``,
      `Estás viendo la subasta:`,
      `🚗 ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      vehicle.trim ? `   ${vehicle.trim}` : '',
      vehicle.km ? `   ${vehicle.km.toLocaleString('es-AR')} km` : '',
      ``,
      auction.current_high_bid > 0
        ? `🏆 Oferta líder actual: ${formatCurrency(auction.current_high_bid)}`
        : `💰 Precio inicial: ${formatCurrency(auction.starting_price)}`,
      ``,
      `Primero, seleccioná un lead para simular la oferta.`,
    ].filter(Boolean).join('\n');

    setMessages([{ id: crypto.randomUUID(), sender: 'bot', text: greeting, time: now() }]);
  }, [auction]);

  const bidMutation = useMutation({
    mutationFn: async (amount: number) => {
      return submitBid(auctionId, selectedLeadId, amount);
    },
    onSuccess: (_data, amount) => {
      addBotMessage(`✅ ¡Tu oferta de ${formatCurrency(amount)} fue registrada correctamente!\n\n🏆 Sos el nuevo líder de la subasta.\n\nTe avisaremos si alguien supera tu oferta.`);
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['feed-bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['feed-publications'] });
    },
    onError: (e: Error) => {
      addBotMessage(`❌ ${e.message}`);
    },
  });

  const handleSelectLead = (leadId: string, leadName: string) => {
    setSelectedLeadId(leadId);
    setSelectedLeadName(leadName);
    setAwaitingLead(false);
    addBotMessage(`Perfecto, ${leadName}. 👤\n\nEscribí el monto de tu oferta en ARS.\nEj: 8500000`);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    if (awaitingLead) {
      toast.error('Seleccioná un lead primero');
      return;
    }

    const amount = Number(input.replace(/\D/g, ''));
    addUserMessage(input);
    setInput('');

    if (!amount || amount <= 0) {
      addBotMessage('❌ El monto ingresado no es válido. Ingresá un número entero.\nEj: 8500000');
      return;
    }

    const minBid = (auction?.current_high_bid || auction?.starting_price || 0);
    if (amount <= minBid) {
      addBotMessage(`❌ Tu oferta no alcanza el mínimo actual.\n\n💰 Mínimo requerido: ${formatCurrency(minBid + 1)}\n\nIngresá un monto superior.`);
      return;
    }

    bidMutation.mutate(amount);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-telegram-bg rounded-lg border overflow-hidden flex flex-col lg:h-full" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="bg-telegram text-white px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <p className="font-medium text-sm">SubastaBot</p>
            <p className="text-[10px] opacity-80">en línea</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <TelegramMessage
            key={msg.id}
            sender={msg.sender}
            senderName={msg.sender === 'bot' ? '🤖 SubastaBot' : selectedLeadName || 'Oferente'}
            text={msg.text}
            time={msg.time}
          />
        ))}

        {/* Lead selector */}
        {awaitingLead && leads && leads.length > 0 && (
          <div className="bg-card border rounded-lg p-3 max-w-[85%]">
            <p className="text-xs font-medium text-muted-foreground mb-2">Seleccionar lead (demo):</p>
            <div className="flex flex-wrap gap-1.5">
              {leads.slice(0, 8).map((lead) => (
                <Button
                  key={lead.id}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => handleSelectLead(lead.id, lead.full_name)}
                >
                  {lead.full_name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-card p-2 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={awaitingLead ? 'Seleccioná un lead arriba...' : 'Escribí tu oferta...'}
          disabled={awaitingLead || bidMutation.isPending}
          className="h-9 text-sm bg-background"
        />
        <Button
          size="icon"
          className="h-9 w-9 bg-telegram hover:bg-telegram/90 shrink-0"
          onClick={handleSend}
          disabled={awaitingLead || bidMutation.isPending || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
