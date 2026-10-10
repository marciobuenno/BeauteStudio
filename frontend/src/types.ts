// Hand-written mirrors of the backend Pydantic models (backend/models/*) — keep in
// sync in the same edit; nothing infers across the HTTP boundary.

export type AppointmentStatus = "confirmed" | "cancelled" | "completed";

export interface Me {
  studio_id: string;
  studio_name: string;
  slug: string;
  owner_name: string;
  email: string;
  phone: string;
  plan: string;
  plan_expires_at: string | null;
  today: string;
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  phone: string;
  address: string;
  about: string;
  plan: string;
  plan_expires_at: string | null;
  created_at: string;
}

export interface BusinessHour {
  id: string;
  studio_id: string;
  weekday: number;
  open_time: string;
  close_time: string;
  closed: boolean;
}

export interface Service {
  id: string;
  studio_id: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  duration_min: number;
  image_url: string;
  active: boolean;
  created_at: string;
}

export interface Professional {
  id: string;
  studio_id: string;
  name: string;
  specialty: string;
  bio: string;
  image_url: string;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  studio_id: string;
  service_id: string;
  service_name: string;
  professional_id: string | null;
  professional_name: string | null;
  date: string;
  time: string;
  duration_min: number;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface Metrics {
  today: string;
  today_count: number;
  today_revenue_cents: number;
  week_count: number;
  month_revenue_cents: number;
  month_count: number;
  month_customers: number;
  today_appointments: Appointment[];
}

export interface PublicStudio {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  about: string;
  phone: string;
  address: string;
  today: string;
  categories: string[];
  services: Service[];
  professionals: Professional[];
  hours: BusinessHour[];
}
