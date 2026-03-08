import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useReservationCount(productId: string) {
  return useQuery({
    queryKey: ['reservation-count', productId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId)
        .in('status', ['pending', 'ordered', 'ready']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!productId,
  });
}
