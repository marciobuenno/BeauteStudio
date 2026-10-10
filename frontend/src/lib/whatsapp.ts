// WhatsApp deep links: the studio taps and WhatsApp opens with the message ready.
// Free and requires no provider account — nothing is sent without the studio's tap.
import { formatBRL, formatDayLabel } from "@/lib/format";
import type { Appointment } from "@/types";

function digitsBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Brazilian numbers need the 55 country code for wa.me
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${digitsBR(phone)}?text=${encodeURIComponent(message)}`;
}

export function confirmationMessage(appt: Appointment, studioName: string): string {
  const first = appt.customer_name.split(" ")[0];
  return [
    `Oi, ${first}! 💅 Seu horário no ${studioName} está confirmado:`,
    ``,
    `✨ ${appt.service_name}`,
    `📅 ${formatDayLabel(appt.date)} às ${appt.time}`,
    appt.professional_name ? `👩‍🎨 Com ${appt.professional_name}` : "",
    `💰 ${formatBRL(appt.price_cents)}`,
    ``,
    `Chegue com até 10 minutos de tolerância. Qualquer coisa, me avise por aqui!`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function reminderMessage(appt: Appointment, studioName: string): string {
  const first = appt.customer_name.split(" ")[0];
  return [
    `Oi, ${first}! Passando para lembrar do seu horário amanhã no ${studioName} 💖`,
    ``,
    `✨ ${appt.service_name}`,
    `📅 ${formatDayLabel(appt.date)} às ${appt.time}`,
    appt.professional_name ? `👩‍🎨 Com ${appt.professional_name}` : "",
    ``,
    `Posso confirmar sua presença?`,
  ]
    .filter(Boolean)
    .join("\n");
}
