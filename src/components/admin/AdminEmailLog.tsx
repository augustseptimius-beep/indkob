import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

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

type SortField = 'created_at' | 'recipient_email' | 'notification_type' | 'status';
type SortDir = 'asc' | 'desc';

const notificationTypeLabels: Record<string, string> = {
  welcome: 'Velkomst',
  reservation_confirmed: 'Reservation bekræftet',
  reservation_cancelled: 'Reservation annulleret',
  new_product: 'Nyt produkt',
  product_target_reached: 'Mål nået',
  ordered: 'Produkt bestilt',
  arrived: 'Produkt ankommet',
};

export function AdminEmailLog() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = (logs || [])
    .filter(log => {
      if (typeFilter !== 'all' && log.notification_type !== typeFilter) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.recipient_email.toLowerCase().includes(q) ||
          (log.recipient_name || '').toLowerCase().includes(q) ||
          log.subject.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    });

  const uniqueTypes = [...new Set((logs || []).map(l => l.notification_type))];

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email-log ({filtered.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søg på email, navn eller emne..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Alle typer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle typer</SelectItem>
              {uniqueTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {notificationTypeLabels[t] || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Alle statusser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statusser</SelectItem>
              <SelectItem value="sent">Sendt</SelectItem>
              <SelectItem value="failed">Fejlet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Ingen emails fundet
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton field="created_at">Tidspunkt</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="recipient_email">Modtager</SortButton>
                  </TableHead>
                  <TableHead>Emne</TableHead>
                  <TableHead>
                    <SortButton field="notification_type">Type</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="status">Status</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), 'dd. MMM yyyy HH:mm', { locale: da })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.recipient_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {notificationTypeLabels[log.notification_type] || log.notification_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.status === 'sent' ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Sendt</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive" title={log.error_message || ''}>
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Fejlet</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
