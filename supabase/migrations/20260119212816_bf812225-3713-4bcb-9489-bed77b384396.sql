-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  supplier_url TEXT,
  origin_country TEXT,
  category_id UUID REFERENCES public.categories(id),
  price_per_unit DECIMAL(10,2) NOT NULL,
  unit_name TEXT NOT NULL DEFAULT 'stk',
  target_quantity INTEGER NOT NULL,
  minimum_purchase INTEGER NOT NULL DEFAULT 1,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  supplier_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ordered', 'arrived', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_tags table for labels like "Økologisk", "Glutenfri"
CREATE TABLE public.product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for products and tags
CREATE TABLE public.product_tag_relations (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'ready', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wishlist table for product suggestions
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CMS content table for editable landing page content
CREATE TABLE public.cms_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Public read policies (everyone can view products, categories, tags, cms)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anyone can view product_tags" ON public.product_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view product_tag_relations" ON public.product_tag_relations FOR SELECT USING (true);
CREATE POLICY "Anyone can view cms_content" ON public.cms_content FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage, users can view own)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Reservations policies
CREATE POLICY "Users can view own reservations" ON public.reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reservations" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reservations" ON public.reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reservations" ON public.reservations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reservations" ON public.reservations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all reservations" ON public.reservations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Wishlist policies
CREATE POLICY "Authenticated users can create wishlist items" ON public.wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own wishlist" ON public.wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wishlist items" ON public.wishlist FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only policies for content management
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tags" ON public.product_tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tag relations" ON public.product_tag_relations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage cms" ON public.cms_content FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to update product quantity when reservation changes
CREATE OR REPLACE FUNCTION public.update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products 
    SET current_quantity = current_quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products 
    SET current_quantity = current_quantity - OLD.quantity,
        updated_at = now()
    WHERE id = OLD.product_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.products 
    SET current_quantity = current_quantity - OLD.quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for reservation changes
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_product_quantity();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for products and reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Insert default CMS content
INSERT INTO public.cms_content (key, title, content) VALUES 
('hero_title', 'Klitmøllers Indkøbsforening', 'Fællesskab gennem fælles indkøb'),
('hero_description', NULL, 'Vi er en lokal indkøbsforening, hvor beboere går sammen om at købe store partier af kvalitetsvarer til favorable priser. Ved at samle vores købekraft kan vi alle få adgang til økologiske, bæredygtige og unikke produkter.'),
('how_it_works_title', 'Sådan fungerer det', NULL),
('how_it_works_step1', 'Find dit produkt', 'Gennemse vores katalog og find de varer, du gerne vil være med til at bestille.'),
('how_it_works_step2', 'Reserver din andel', 'Tilmeld dig det antal enheder, du ønsker. Se live hvor mange der mangler.'),
('how_it_works_step3', 'Vent på leveringen', 'Når målet er nået, bestiller vi hjem. Du får besked når varen er klar til afhentning.');

-- Insert some default categories
INSERT INTO public.categories (name) VALUES 
('Nødder & Frø'),
('Mel & Bagning'),
('Olie & Vineddike'),
('Tørrede frugter'),
('Krydderier'),
('Drikkevarer'),
('Andet');

-- Insert some default tags
INSERT INTO public.product_tags (name) VALUES 
('Økologisk'),
('Glutenfri'),
('Biodynamisk'),
('Vegansk'),
('Fairtrade'),
('Lokalt');