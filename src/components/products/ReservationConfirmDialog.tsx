import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CheckCircle, ArrowRight, Bell, CreditCard } from 'lucide-react';

interface ReservationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  quantity: number;
  unitName: string;
  pricePerUnit: number;
  currentQuantity: number;
  targetQuantity: number;
}

export function ReservationConfirmDialog({
  open,
  onOpenChange,
  productTitle,
  quantity,
  unitName,
  pricePerUnit,
  currentQuantity,
  targetQuantity,
}: ReservationConfirmDialogProps) {
  const totalPrice = (pricePerUnit * quantity).toFixed(2);
  const progress = Math.min((currentQuantity / targetQuantity) * 100, 100);
  const remaining = targetQuantity - currentQuantity;
  const isComplete = remaining <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <DialogTitle className="font-serif text-xl">Reservation bekræftet!</DialogTitle>
          <DialogDescription className="text-base">
            Du har reserveret <strong>{quantity} {unitName}</strong> af{' '}
            <strong>{productTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Beløb</span>
            <span className="font-semibold">{totalPrice} kr</span>
          </div>
          
          {/* Progress update */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fremskridt</span>
              <span className="font-medium">
                {currentQuantity} / {targetQuantity} {unitName}
              </span>
            </div>
            <div className="progress-bar h-2">
              <div
                className={isComplete ? 'progress-fill-complete' : 'progress-fill'}
                style={{ width: `${progress}%` }}
              />
            </div>
            {isComplete ? (
              <p className="text-xs text-success font-medium">🎉 Målet er nået!</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mangler {remaining} {unitName} mere
              </p>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-semibold text-foreground">Hvad sker der nu?</h4>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 text-sm">
              <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Du får besked via email når produktet er bestilt hjem og klar til afhentning.
              </span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Betaling sker via MobilePay når varerne er bekræftet bestilt.
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button asChild className="gap-2">
            <Link to="/min-side" onClick={() => onOpenChange(false)}>
              Se mine reservationer
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fortsæt med at handle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
