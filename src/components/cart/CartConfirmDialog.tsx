import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail } from 'lucide-react';
import type { CartItem } from '@/contexts/CartContext';

interface CartConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
}

export function CartConfirmDialog({ open, onOpenChange, items }: CartConfirmDialogProps) {
  const navigate = useNavigate();
  const total = items.reduce(
    (sum, item) => sum + item.product.price_per_unit * item.quantity,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <DialogTitle>Reservationer bekræftet!</DialogTitle>
          </div>
          <DialogDescription>
            Dine reservationer er oprettet. Du modtager en samlet bekræftelse på mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {items.map(item => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="truncate mr-2">
                {item.quantity} × {item.product.title}
              </span>
              <span className="font-medium shrink-0">
                {(item.product.price_per_unit * item.quantity).toFixed(2)} kr
              </span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{total.toFixed(2)} kr</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate('/min-side');
            }}
          >
            Se mine reservationer
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate('/produkter');
            }}
          >
            Fortsæt med at handle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
