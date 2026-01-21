import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Reservation, Product } from '@/lib/supabase-types';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function useMyReservations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['my-reservations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!user,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useAllReservations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['all-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          product:products(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Reservation[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('all-reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-reservations'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error('Du skal være logget ind');

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, productId, quantity };
    },
    onMutate: async ({ productId, quantity }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
      
      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData<Product>(['product', productId]);
      
      // Optimistically update the product
      if (previousProduct) {
        queryClient.setQueryData<Product>(['product', productId], {
          ...previousProduct,
          current_quantity: previousProduct.current_quantity + quantity,
        });
      }
      
      return { previousProduct, productId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        queryClient.setQueryData(['product', context.productId], context.previousProduct);
      }
    },
    onSettled: (data) => {
      // Always refetch after error or success to ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (data?.productId) {
        queryClient.invalidateQueries({ queryKey: ['product', data.productId] });
      }
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Reservation> & { id: string }) => {
      const { error } = await supabase
        .from('reservations')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['all-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
