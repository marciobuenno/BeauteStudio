import { format, parse } from "date-fns";

export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// The backend stores weekdays Python-style (0=Monday..6=Sunday); JS Date.getDay() is
// 0=Sunday..6=Saturday. Convert at the boundary, never compare the two raw.
export function pyToJsWeekday(pyWeekday: number): number {
  return (pyWeekday + 1) % 7;
}

export function weekdayLabel(pyWeekday: number): string {
  return WEEKDAYS_PT[pyToJsWeekday(pyWeekday)];
}

export function formatBRL(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

// "yyyy-MM-dd" parsed as LOCAL midnight — new Date(iso) would shift the day west of UTC.
export function parseISODate(iso: string): Date {
  return parse(iso, "yyyy-MM-dd", new Date());
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDateBR(iso: string): string {
  // Accepts both a bare "yyyy-MM-dd" and a full ISO datetime (e.g. plan_expires_at).
  return format(parseISODate(iso.split("T")[0]), "dd/MM/yyyy");
}

export function formatDayLabel(iso: string): string {
  const date = parseISODate(iso.split("T")[0]);
  return `${WEEKDAYS_PT[date.getDay()]}, ${format(date, "dd/MM")}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

// Mirrors backend routers/auth.py:slugify (preview only — backend decides the final slug).
export function slugifyPreview(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "studio";
}

export const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};
