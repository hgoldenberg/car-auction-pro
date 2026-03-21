import { supabase } from '@/integrations/supabase/client';

export async function publishToTelegramReal(auctionId: string, groupIds: string[]) {
  const { data, error } = await supabase.functions.invoke('telegram-publish', {
    body: { auction_id: auctionId, group_ids: groupIds },
  });

  if (error) throw new Error(error.message || 'Error al publicar en Telegram');
  if (data?.error) throw new Error(data.error);

  return data as {
    success: boolean;
    published: number;
    failed: number;
    results: Array<{
      group_id: string;
      group_name: string;
      success: boolean;
      message_id?: number;
      error?: string;
    }>;
  };
}
