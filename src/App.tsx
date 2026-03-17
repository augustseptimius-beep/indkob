import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CookieBanner } from "@/components/CookieBanner";
import { ConsentModal } from "@/components/ConsentModal";
import { CartSidebar } from "@/components/cart/CartSidebar";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import MyPage from "./pages/MyPage";
import WishlistPage from "./pages/WishlistPage";
import AdminPage from "./pages/AdminPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/produkter" element={<ProductsPage />} />
              <Route path="/produkt/:id" element={<ProductDetailPage />} />
              <Route path="/min-side" element={<MyPage />} />
              <Route path="/oenskeliste" element={<WishlistPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/privatlivspolitik" element={<PrivacyPolicyPage />} />
              <Route path="/om" element={<AboutPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieBanner />
            <CartSidebar />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
