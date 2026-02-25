import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useEmailTemplates, useUpdateEmailTemplate, useCreateEmailTemplate, useDeleteEmailTemplate, EmailTemplate } from '@/hooks/useEmailTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus, Trash2, Mail, Eye, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TRIGGER_TYPES = [
  { value: 'product_status_ordered', label: 'Produkt bestilt (auto)' },
  { value: 'product_status_arrived', label: 'Produkt ankommet (auto)' },
  { value: 'payment_confirmed', label: 'Betaling bekræftet (auto)' },
  { value: 'manual', label: 'Manuel udsendelse' },
];

const AVAILABLE_VARIABLES = [
  { key: '{{user_name}}', desc: 'Brugerens navn' },
  { key: '{{user_email}}', desc: 'Brugerens email' },
  { key: '{{product_title}}', desc: 'Produktnavn' },
  { key: '{{quantity}}', desc: 'Antal reserveret' },
  { key: '{{unit_name}}', desc: 'Enhed (kg, stk, osv.)' },
  { key: '{{price_per_unit}}', desc: 'Pris pr. enhed' },
  { key: '{{total_price}}', desc: 'Samlet pris' },
  { key: '{{mobilepay_number}}', desc: 'MobilePay nummer fra CMS' },
  { key: '{{paid_at}}', desc: 'Betalingsdato' },
];

export function AdminEmailTemplates() {
  const { data: templates, isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const createTemplate = useCreateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    subject: '',
    body_html: '',
    description: '',
    trigger_type: 'manual',
    is_active: true,
  });

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      key: template.key,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      description: template.description || '',
      trigger_type: template.trigger_type,
      is_active: template.is_active,
    });
    setIsCreating(false);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      key: '',
      name: '',
      subject: '',
      body_html: '<p>Hej {{user_name}},</p>\n\n<p>Din besked her...</p>',
      description: '',
      trigger_type: 'manual',
      is_active: true,
    });
    setIsCreating(true);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (isCreating) {
      await createTemplate.mutateAsync({
        key: formData.key,
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        is_active: formData.is_active,
      });
    } else if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        is_active: formData.is_active,
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deletingTemplate) {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      setDeletingTemplate(null);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    // Replace variables with sample data
    let html = template.body_html;
    html = html.replace(/\{\{user_name\}\}/g, 'Anders Andersen');
    html = html.replace(/\{\{user_email\}\}/g, 'anders@example.dk');
    html = html.replace(/\{\{product_title\}\}/g, 'Økologiske Mandler');
    html = html.replace(/\{\{quantity\}\}/g, '2');
    html = html.replace(/\{\{unit_name\}\}/g, 'kg');
    html = html.replace(/\{\{price_per_unit\}\}/g, '45');
    html = html.replace(/\{\{total_price\}\}/g, '90');
    html = html.replace(/\{\{mobilepay_number\}\}/g, '12345678');
    html = html.replace(/\{\{paid_at\}\}/g, new Date().toLocaleDateString('da-DK'));
    
    const cleanHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'li', 'ol', 'div', 'span', 'a', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'hr'],
      ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'width', 'height', 'target'],
    });
    setPreviewHtml(cleanHtml);
    setIsPreviewOpen(true);
  };

  const getTriggerLabel = (trigger: string) => {
    const found = TRIGGER_TYPES.find(t => t.value === trigger);
    return found?.label || trigger;
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser email-skabeloner...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Email-skabeloner</h2>
          <p className="text-sm text-muted-foreground">
            Rediger indholdet af automatiske emails
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ny skabelon
        </Button>
      </div>

      <div className="grid gap-4">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {template.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getTriggerLabel(template.trigger_type)}
                      </Badge>
                      {template.description && (
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePreview(template)}
                    title="Forhåndsvis"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(template)}
                    title="Rediger"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingTemplate(template)}
                    title="Slet"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Ingen email-skabeloner. Klik "Ny skabelon" for at oprette en.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Opret email-skabelon' : 'Rediger email-skabelon'}
            </DialogTitle>
            <DialogDescription>
              Brug variabler som {`{{user_name}}`} til at indsætte dynamisk indhold
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isCreating && (
              <div className="space-y-2">
                <Label htmlFor="key">Unik nøgle *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="f.eks. welcome_email"
                />
                <p className="text-xs text-muted-foreground">
                  Bruges til at identificere skabelonen internt
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="f.eks. Velkomstmail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Emne *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Email emne (kan indeholde variabler)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Intern beskrivelse af hvornår mailen sendes"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Indhold (HTML) *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 gap-1">
                        <Info className="h-3 w-3" />
                        Tilgængelige variabler
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="space-y-1">
                        {AVAILABLE_VARIABLES.map((v) => (
                          <div key={v.key} className="text-xs">
                            <code className="bg-muted px-1 rounded">{v.key}</code>
                            <span className="ml-2 text-muted-foreground">{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="body"
                value={formData.body_html}
                onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                placeholder="<p>Hej {{user_name}},</p>..."
                className="font-mono text-sm min-h-[200px]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="is_active" className="font-medium">Aktiv</Label>
                <p className="text-sm text-muted-foreground">
                  Inaktive skabeloner sendes ikke automatisk
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annuller
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.subject || !formData.body_html || (isCreating && !formData.key)}
            >
              {isCreating ? 'Opret skabelon' : 'Gem ændringer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - matches actual email layout from edge function */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Forhåndsvisning af email
            </DialogTitle>
            <DialogDescription>
              Sådan vil emailen se ud med eksempeldata (variabler er erstattet)
            </DialogDescription>
          </DialogHeader>
          
          {/* Sample data info box */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-muted-foreground">
              <strong>Eksempeldata:</strong> Anders Andersen, anders@example.dk, Økologiske Mandler, 2 kg, 45 kr/kg = 90 kr
            </div>
          </div>
          
          {/* Email preview container - scrollable */}
          <div className="flex-1 overflow-y-auto border rounded-lg bg-slate-100">
            <div className="p-4">
              {/* Email wrapper - exact match with edge function wrapEmailContent */}
              <div 
                style={{ 
                  maxWidth: '600px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Header */}
                <div 
                  style={{
                    backgroundColor: '#5c6b5a',
                    padding: '24px',
                    textAlign: 'center' as const
                  }}
                >
                  <h1 
                    style={{
                      color: '#ffffff',
                      margin: 0,
                      fontSize: '28px',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 600
                    }}
                  >
                    Klitmøllers Indkøbsfællesskab
                  </h1>
                  <p 
                    style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: '8px 0 0 0',
                      fontSize: '14px',
                      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    }}
                  >
                    Fælles indkøb af kvalitetsvarer
                  </p>
                </div>
                
                {/* Content */}
                <div 
                  style={{
                    padding: '32px 24px',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#333333'
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                
                {/* Footer */}
                <div 
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: '24px',
                    borderTop: '1px solid #e9ecef',
                    textAlign: 'center' as const
                  }}
                >
                  <p 
                    style={{
                      margin: 0,
                      color: '#5c6b5a',
                      fontWeight: 600,
                      fontSize: '14px',
                      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    }}
                  >
                    Med venlig hilsen,
                  </p>
                  <p 
                    style={{
                      margin: '4px 0 0 0',
                      color: '#5c6b5a',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '16px'
                    }}
                  >
                    Klitmøllers Indkøbsfællesskab
                  </p>
                  <p 
                    style={{
                      margin: '16px 0 0 0',
                      color: '#6c757d',
                      fontSize: '12px',
                      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    }}
                  >
                    Denne email er sendt automatisk. Besvar venligst ikke denne email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette email-skabelonen "{deletingTemplate?.name}". 
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
