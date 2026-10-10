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
  reminder_sent_at: string | null;
}

export interface WeekDay {
  date: string;
  weekday: number; // python-style: 0=Monday .. 6=Sunday
  closed: boolean;
  appointments: Appointment[];
}

export interface WeekAgenda {
  start: string;
  end: string;
  today: string;
  days: WeekDay[];
}

export interface RevenueSlice {
  label: string;
  revenue_cents: number;
  count: number;
}

export interface MonthPoint {
  month: string;
  label: string;
  revenue_cents: number;
  count: number;
}

export interface RevenueReport {
  start: string;
  end: string;
  total_revenue_cents: number;
  total_count: number;
  cancelled_count: number;
  avg_ticket_cents: number;
  customers: number;
  by_service: RevenueSlice[];
  by_professional: RevenueSlice[];
  by_month: MonthPoint[];
}

export interface BillingConfig {
  enabled: boolean;
  monthly_cents: number;
  annual_cents: number;
}

export interface PixCharge {
  payment_id: string;
  status: string;
  plan: string;
  amount_cents: number;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  created_at: string;
}

export interface PixStatus {
  payment_id: string;
  status: string;
  approved: boolean;
  plan: string;
  amount_cents: number;
  plan_expires_at: string | null;
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
