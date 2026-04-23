import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";

// Lazy-load alle ikke-LCP-ruter for at reducere initial JS-bundle.
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const MyPage = lazy(() => import("./pages/MyPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Defer non-critical UI (cart sidebar, cookie banner, consent modal) ud af initial bundle.
const CartSidebar = lazy(() =>
  import("@/components/cart/CartSidebar").then(m => ({ default: m.CartSidebar }))
);
const CookieBanner = lazy(() =>
  import("@/components/CookieBanner").then(m => ({ default: m.CookieBanner }))
);
const ConsentModal = lazy(() =>
  import("@/components/ConsentModal").then(m => ({ default: m.ConsentModal }))
);

function DeferredOverlays() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as any;
    const schedule = w.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
    const handle = schedule(() => setReady(true));
    return () => {
      const cancel = w.cancelIdleCallback || clearTimeout;
      cancel(handle);
    };
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <CartSidebar />
      <CookieBanner />
      <ConsentModal />
    </Suspense>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen" />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/produkter" element={<ProductsPage />} />
                <Route path="/produkt/:id" element={<ProductDetailPage />} />
                <Route path="/min-side" element={<MyPage />} />
                <Route path="/oenskeliste" element={<WishlistPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/privatlivspolitik" element={<PrivacyPolicyPage />} />
                <Route path="/nulstil-adgangskode" element={<ResetPasswordPage />} />
                <Route path="/om" element={<AboutPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <DeferredOverlays />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
