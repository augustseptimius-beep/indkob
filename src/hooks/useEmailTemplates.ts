import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: string }) => {
      const { id, ...updates } = template;
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Email-skabelon opdateret');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Kunne ikke opdatere skabelon');
    },
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Email-skabelon oprettet');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Kunne ikke oprette skabelon');
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Email-skabelon slettet');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Kunne ikke slette skabelon');
    },
  });
}
