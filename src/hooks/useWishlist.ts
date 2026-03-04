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
  is_added: boolean;
  vote_count: number;
  user_has_voted: boolean;
  comment_count: number;
  creator_name: string | null;
}

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!items?.length) return [] as WishlistItemWithMeta[];

      const itemIds = items.map((i) => i.id);
      const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))] as string[];

      // Fetch votes, comments, and creator profiles in parallel
      const [votesRes, commentsRes, profilesRes] = await Promise.all([
        supabase.from('wishlist_votes').select('wishlist_item_id, user_id').in('wishlist_item_id', itemIds),
        supabase.from('wishlist_comments').select('wishlist_item_id').in('wishlist_item_id', itemIds),
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const voteMap = new Map<string, { count: number; userVoted: boolean }>();
      const commentMap = new Map<string, number>();
      const profileMap = new Map<string, string>();

      for (const v of votesRes.data ?? []) {
        const entry = voteMap.get(v.wishlist_item_id) ?? { count: 0, userVoted: false };
        entry.count++;
        if (v.user_id === user?.id) entry.userVoted = true;
        voteMap.set(v.wishlist_item_id, entry);
      }

      for (const c of commentsRes.data ?? []) {
        commentMap.set(c.wishlist_item_id, (commentMap.get(c.wishlist_item_id) ?? 0) + 1);
      }

      for (const p of profilesRes.data ?? []) {
        if (p.full_name) profileMap.set(p.user_id, p.full_name);
      }

      return items.map((item) => ({
        ...item,
        vote_count: voteMap.get(item.id)?.count ?? 0,
        user_has_voted: voteMap.get(item.id)?.userVoted ?? false,
        comment_count: commentMap.get(item.id) ?? 0,
        creator_name: item.user_id ? (profileMap.get(item.user_id) ?? 'Anonym') : 'Anonym',
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

export function useToggleWishlistAdded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_added }: { id: string; is_added: boolean }) => {
      const { error } = await supabase
        .from('wishlist')
        .update({ is_added })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}
