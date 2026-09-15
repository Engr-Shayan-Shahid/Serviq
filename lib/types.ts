export type StaffRole = "owner" | "kitchen" | "waiter";

export type Staff = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: StaffRole;
  name: string;
  email: string;
  created_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  owner_id: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export type OrderStatus = "pending" | "preparing" | "ready" | "served";

export type Order = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  quantity: number;
  special_note: string | null;
  created_at: string;
};

export type TimeSlot = "all_day" | "breakfast" | "lunch" | "dinner";

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  time_slot: TimeSlot;
  created_at: string;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
};

export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  table_number: string;
  qr_code_url: string | null;
  created_at: string;
};

export const PANEL_BY_ROLE: Record<StaffRole, string> = {
  owner: "/dashboard",
  kitchen: "/kitchen",
  waiter: "/waiter",
};

export const ROLE_BY_PANEL: Record<string, StaffRole> = {
  "/dashboard": "owner",
  "/kitchen": "kitchen",
  "/waiter": "waiter",
};
