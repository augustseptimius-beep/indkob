// Extended types for our application
export type ProductStatus = 'open' | 'ordered' | 'arrived' | 'completed';
export type ReservationStatus = 'pending' | 'ordered' | 'ready' | 'completed';
export type AppRole = 'admin' | 'member';

export interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  supplier_url: string | null;
  origin_country: string | null;
  category_id: string | null;
  price_per_unit: number;
  unit_name: string;
  target_quantity: number;
  minimum_purchase: number;
  current_quantity: number;
  supplier_name: string | null;
  status: ProductStatus;
  is_organic: boolean;
  comparison_price: number | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags?: ProductTag[];
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface ProductTag {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Reservation {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  status: ReservationStatus;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  user_id: string | null;
  title: string;
  note: string | null;
  link: string | null;
  created_at: string;
}

export interface CMSContent {
  id: string;
  key: string;
  title: string | null;
  content: string | null;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
