import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Trash2, ShoppingBag, Package, Loader2 } from 'lucide-react';
import { CartConfirmDialog } from './CartConfirmDialog';

export function CartSidebar() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState<typeof items>([]);

  const total = items.reduce(
    (sum, item) => sum + item.product.price_per_unit * item.quantity,
    0
  );

  const handleConfirm = async () => {
    if (!user) {
      navigate('/auth');
      setIsOpen(false);
      return;
    }

    setIsSubmitting(true);
    const batchId = crypto.randomUUID();

    try {
      for (const item of items) {
        const { error } = await supabase.from('reservations').insert({
          user_id: user.id,
          product_id: item.productId,
          quantity: item.quantity,
          batch_id: batchId,
        });
        if (error) throw error;
      }

      // Send batch notification
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'batch_reservation_confirmed',
              batchId,
              userId: user.id,
            }),
          }
        );
      } catch (e) {
        console.error('Batch notification failed:', e);
      }

      setConfirmedItems([...items]);
      clearCart();
      setIsOpen(false);
      setConfirmOpen(true);

      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      items.forEach(item => {
        queryClient.invalidateQueries({ queryKey: ['product', item.productId] });
      });
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke oprette reservationer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Kurv ({items.length})
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <ShoppingBag className="h-12 w-12 opacity-30" />
              <p>Din kurv er tom</p>
              <Button variant="outline" onClick={() => { setIsOpen(false); navigate('/produkter'); }}>
                Se produkter
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-3 p-3 rounded-lg border bg-card">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-white shrink-0">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.product.price_per_unit.toFixed(2)} kr/{item.product.unit_name}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                Math.max(item.product.minimum_purchase, item.quantity - 1)
                              )
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e =>
                              updateQuantity(
                                item.productId,
                                Math.max(item.product.minimum_purchase, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-12 h-7 text-center border-0 text-sm p-0"
                            min={item.product.minimum_purchase}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>

                        <span className="ml-auto text-sm font-semibold">
                          {(item.product.price_per_unit * item.quantity).toFixed(2)} kr
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{total.toFixed(2)} kr</span>
                </div>

                {!user ? (
                  <Button className="w-full" onClick={() => { navigate('/auth?mode=signup'); setIsOpen(false); }}>
                    Log ind for at bekræfte
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleConfirm} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opretter reservationer...
                      </>
                    ) : (
                      'Bekræft reservationer'
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CartConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        items={confirmedItems}
      />
    </>
  );
}
