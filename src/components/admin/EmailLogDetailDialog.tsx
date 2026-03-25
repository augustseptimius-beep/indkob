import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, RotateCcw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_key: string | null;
  notification_type: string;
  status: string;
  error_message: string | null;
  product_id: string | null;
  user_id: string | null;
  created_at: string;
}

const notificationTypeLabels: Record<string, string> = {
  welcome: 'Velkomst',
  reservation_confirmed: 'Reservation bekræftet',
  reservation_cancelled: 'Reservation annulleret',
  new_product: 'Nyt produkt',
  product_target_reached: 'Mål nået',
  product_almost_reached: 'Produkt næsten i mål',
  ordered: 'Produkt bestilt',
  ready_for_pickup: 'Klar til afhentning',
  payment_confirmed: 'Betaling bekræftet',
  batch_reservation_confirmed: 'Batchreservation bekræftet',
};

interface EmailLogDetailDialogProps {
  log: EmailLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResend?: (logId: string) => void;
  resending?: boolean;
}

export function EmailLogDetailDialog({ log, open, onOpenChange, onResend, resending }: EmailLogDetailDialogProps) {
  if (!log) return null;

  const formattedDate = format(new Date(log.created_at), "d. MMMM yyyy 'kl.' HH:mm:ss", { locale: da });
  const typeLabel = notificationTypeLabels[log.notification_type] || log.notification_type;

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(18);
    doc.text('Email-dokumentation', margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Genereret: ${format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}`, margin, y);
    doc.setTextColor(0);
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 10;

    const fields: [string, string][] = [
      ['Log-ID', log.id],
      ['Afsendt', formattedDate],
      ['Modtager', log.recipient_name ? `${log.recipient_name} <${log.recipient_email}>` : log.recipient_email],
      ['Emne', log.subject],
      ['Notifikationstype', typeLabel],
      ['Status', log.status === 'sent' ? 'Sendt' : 'Fejlet'],
    ];

    if (log.error_message) fields.push(['Fejlbesked', log.error_message]);
    if (log.template_key) fields.push(['Skabelon-nøgle', log.template_key]);
    if (log.product_id) fields.push(['Produkt-ID', log.product_id]);
    if (log.user_id) fields.push(['Bruger-ID', log.user_id]);

    doc.setFontSize(11);
    for (const [label, value] of fields) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');

      const labelWidth = doc.getTextWidth(`${label}: `);
      const maxWidth = 170 - labelWidth;
      const lines = doc.splitTextToSize(value, maxWidth);
      doc.text(lines, margin + labelWidth, y);
      y += lines.length * 6 + 4;

      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    }

    doc.save(`email-dokumentation-${log.id.slice(0, 8)}.pdf`);
  };

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm break-all">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Email-detaljer</DialogTitle>
          <DialogDescription>Detaljeret visning af afsendt email med metadata til dokumentation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <DetailRow label="Afsendt" value={formattedDate} />
          <DetailRow
            label="Modtager"
            value={log.recipient_name ? `${log.recipient_name} (${log.recipient_email})` : log.recipient_email}
          />
          <DetailRow label="Emne" value={log.subject} />
          <DetailRow label="Type" value={typeLabel} />

          <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <div>
              {log.status === 'sent' ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Sendt
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive border-red-200 bg-red-50">
                  <XCircle className="h-3 w-3 mr-1" /> Fejlet
                </Badge>
              )}
            </div>
          </div>

          {log.error_message && (
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5">
              <span className="text-sm font-medium text-muted-foreground">Fejlbesked</span>
              <span className="text-sm text-destructive break-all">{log.error_message}</span>
            </div>
          )}

          <Separator className="my-2" />

          <DetailRow label="Skabelon-nøgle" value={log.template_key} />
          <DetailRow label="Produkt-ID" value={log.product_id} />
          <DetailRow label="Bruger-ID" value={log.user_id} />
          <DetailRow label="Log-ID" value={log.id} />
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {log.status === 'failed' && log.template_key && onResend && (
            <Button
              variant="default"
              disabled={resending}
              onClick={() => onResend(log.id)}
              className="flex-1"
            >
              {resending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Gensend
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
