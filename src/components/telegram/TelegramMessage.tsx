import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

export interface TelegramMessageProps {
  sender: 'bot' | 'user';
  senderName?: string;
  text: string;
  time: string;
  imageUrl?: string | null;
  children?: React.ReactNode;
}

export function TelegramMessage({ sender, senderName, text, time, imageUrl, children }: TelegramMessageProps) {
  const isBot = sender === 'bot';

  return (
    <div className={cn('flex gap-2 max-w-[85%]', isBot ? 'mr-auto' : 'ml-auto flex-row-reverse')}>
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5',
        isBot ? 'bg-telegram text-white' : 'bg-muted text-muted-foreground'
      )}>
        {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div>
        {senderName && (
          <p className={cn('text-xs font-medium mb-0.5', isBot ? 'text-telegram' : 'text-muted-foreground')}>
            {senderName}
          </p>
        )}
        <div className={cn(
          'rounded-xl px-3 py-2 text-sm leading-relaxed',
          isBot
            ? 'bg-card border border-border rounded-tl-sm'
            : 'bg-telegram/10 text-foreground rounded-tr-sm'
        )}>
          <div className="whitespace-pre-line">{text}</div>
          {children}
          <p className={cn('text-[10px] mt-1 tabular-nums', isBot ? 'text-muted-foreground' : 'text-telegram/60')}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}
