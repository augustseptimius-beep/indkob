import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CMSContent } from '@/lib/supabase-types';

export function useCMSContent() {
  return useQuery({
    queryKey: ['cms-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*');

      if (error) throw error;
      
      // Convert to a key-value map for easier access
      const contentMap: Record<string, CMSContent> = {};
      data.forEach((item) => {
        contentMap[item.key] = item as CMSContent;
      });
      
      return contentMap;
    },
  });
}

export function useUpdateCMSContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, title, content }: { key: string; title?: string; content?: string }) => {
      const { error } = await supabase
        .from('cms_content')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
    },
  });
}
