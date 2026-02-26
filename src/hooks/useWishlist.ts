import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WishlistItemWithMeta {
  id: string;
  user_id: string | null;
  title: string;
  note: string | null;
  link: string | null;
  created_at: string;
  vote_count: number;
  user_has_voted: boolean;
  comment_count: number;
}

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      // Fetch all wishlist items
      const { data: items, error } = await supabase
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!items?.length) return [] as WishlistItemWithMeta[];

      const itemIds = items.map((i) => i.id);

      // Fetch votes
      const { data: votes } = await supabase
        .from('wishlist_votes')
        .select('wishlist_item_id, user_id')
        .in('wishlist_item_id', itemIds);

      // Fetch comment counts
      const { data: comments } = await supabase
        .from('wishlist_comments')
        .select('wishlist_item_id')
        .in('wishlist_item_id', itemIds);

      const voteMap = new Map<string, { count: number; userVoted: boolean }>();
      const commentMap = new Map<string, number>();

      for (const v of votes ?? []) {
        const entry = voteMap.get(v.wishlist_item_id) ?? { count: 0, userVoted: false };
        entry.count++;
        if (v.user_id === user?.id) entry.userVoted = true;
        voteMap.set(v.wishlist_item_id, entry);
      }

      for (const c of comments ?? []) {
        commentMap.set(c.wishlist_item_id, (commentMap.get(c.wishlist_item_id) ?? 0) + 1);
      }

      return items.map((item) => ({
        ...item,
        vote_count: voteMap.get(item.id)?.count ?? 0,
        user_has_voted: voteMap.get(item.id)?.userVoted ?? false,
        comment_count: commentMap.get(item.id) ?? 0,
      })) as WishlistItemWithMeta[];
    },
    enabled: !!user,
  });
}

export function useWishlistComments(wishlistItemId: string | null) {
  return useQuery({
    queryKey: ['wishlist-comments', wishlistItemId],
    queryFn: async () => {
      if (!wishlistItemId) return [];
      const { data, error } = await supabase
        .from('wishlist_comments')
        .select('id, content, created_at')
        .eq('wishlist_item_id', wishlistItemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!wishlistItemId,
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
        .insert({ user_id: user.id, title, note, link })
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

export function useToggleVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ wishlistItemId, hasVoted }: { wishlistItemId: string; hasVoted: boolean }) => {
      if (!user) throw new Error('Du skal være logget ind');

      if (hasVoted) {
        const { error } = await supabase
          .from('wishlist_votes')
          .delete()
          .eq('wishlist_item_id', wishlistItemId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wishlist_votes')
          .insert({ wishlist_item_id: wishlistItemId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ wishlistItemId, content }: { wishlistItemId: string; content: string }) => {
      if (!user) throw new Error('Du skal være logget ind');

      const { error } = await supabase
        .from('wishlist_comments')
        .insert({ wishlist_item_id: wishlistItemId, user_id: user.id, content });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-comments', variables.wishlistItemId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}
