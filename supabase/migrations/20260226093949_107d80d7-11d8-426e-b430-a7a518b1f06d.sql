
-- Create wishlist_votes table (one vote per user per wishlist item)
CREATE TABLE public.wishlist_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_item_id uuid NOT NULL REFERENCES public.wishlist(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(wishlist_item_id, user_id)
);

-- Create wishlist_comments table (anonymous comments)
CREATE TABLE public.wishlist_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_item_id uuid NOT NULL REFERENCES public.wishlist(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishlist_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_comments ENABLE ROW LEVEL SECURITY;

-- Wishlist votes policies
CREATE POLICY "Authenticated users can view all votes" ON public.wishlist_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert own votes" ON public.wishlist_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.wishlist_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Wishlist comments policies
CREATE POLICY "Authenticated users can view all comments" ON public.wishlist_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert own comments" ON public.wishlist_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.wishlist_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage everything
CREATE POLICY "Admins can manage wishlist_votes" ON public.wishlist_votes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage wishlist_comments" ON public.wishlist_comments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Update wishlist SELECT policy: let all authenticated users see all items
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlist;
CREATE POLICY "Authenticated users can view all wishlist items" ON public.wishlist
  FOR SELECT USING (auth.uid() IS NOT NULL);
