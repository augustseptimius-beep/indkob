import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WishlistItem } from '@/lib/supabase-types';
import { useAuth } from '@/contexts/AuthContext';

export function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
  });
}

export function useCreateWishlistItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, note, link }: { title: string; note?: string; link?: string }) => {
      if (!user) throw new Error('Du skal være logget ind');

      const { data, error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          title,
          note,
          link,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}
