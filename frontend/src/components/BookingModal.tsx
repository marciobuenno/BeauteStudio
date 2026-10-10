import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatBRL, formatDayLabel, maskPhone, parseISODate, pyToJsWeekday, toISODate } from "@/lib/format";
import type { Appointment, BusinessHour, Professional, Service } from "@/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEPS = ["Profissional", "Data", "Horário", "Seus dados"] as const;

interface BookingModalProps {
  slug: string;
  service: Service;
  professionals: Professional[];
  hours: BusinessHour[];
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingModal({ slug, service, professionals, hours, today, open, onOpenChange }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [professionalId, setProfessionalId] = useState<string>("any");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setProfessionalId("any");
      setDate(null);
      setTime(null);
      setName("");
      setPhone("");
      setNotes("");
      setConfirmed(null);
    }
  }, [open]);

  // hours[].weekday is Python-style (0=Mon); Date.getDay() is 0=Sun — convert before comparing.
  const closedWeekdays = useMemo(
    () => new Set(hours.filter((h) => h.closed).map((h) => pyToJsWeekday(h.weekday))),
    [hours],
  );
  const disabledDays = useMemo(
    () => [{ before: parseISODate(today) }, (d: Date) => closedWeekdays.has(d.getDay())],
    [closedWeekdays, today],
  );

  const slotsQ = useQuery({
    queryKey: ["slots", slug, service.id, date, professionalId],
    queryFn: () =>
      apiGet<string[]>(
        `/public/studios/${slug}/slots?date=${date}&service_id=${service.id}&professional_id=${professionalId}`,
      ),
    enabled: open && !!date,
    retry: false,
  });

  const book = useMutation({
    mutationFn: () =>
      apiPost<Appointment>(`/public/studios/${slug}/appointments`, {
        service_id: service.id,
        professional_id: professionalId === "any" ? null : professionalId,
        date,
        time,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        notes: notes.trim(),
      }),
    onSuccess: (appt) => setConfirmed(appt),
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível confirmar. Tente outro horário.")),
  });

  const professionalLabel =
    professionalId === "any"
      ? "Qualquer profissional disponível"
      : professionals.find((p) => p.id === professionalId)?.name ?? "—";

  const canAdvance = step === 1 || (step === 2 && !!date) || (step === 3 && !!time);
  const canSubmit = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border-[#E7E2D9] p-0" showCloseButton={!confirmed}>
        {confirmed ? (
          <div className="flex flex-col items-center px-8 py-10 text-center" data-testid="booking-success">
            <CheckCircle2 className="h-14 w-14 text-green-600" />
            <h3 className="mt-4 font-serif text-2xl text-stone-900">Agendamento confirmado!</h3>
            <p className="mt-1 text-sm text-stone-500">
              Esperamos você, {confirmed.customer_name.split(" ")[0]}. Chegue com até 10 minutos de tolerância.
            </p>
            <div className="mt-6 w-full rounded-2xl border border-[#E7E2D9] bg-[#F5EFE6] p-4 text-left text-sm">
              <p className="font-serif text-base text-stone-900">{confirmed.service_name}</p>
              <p className="mt-1 text-stone-600">
                {formatDayLabel(confirmed.date)} às {confirmed.time} · {confirmed.professional_name}
              </p>
              <p className="mt-1 font-medium text-stone-900">{formatBRL(confirmed.price_cents)}</p>
            </div>
            <Button className="mt-6 w-full" onClick={() => onOpenChange(false)} data-testid="booking-success-close-button">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex max-h-[85vh] flex-col">
            <div className="border-b border-[#E7E2D9] px-6 py-5">
              <p className="text-xs uppercase tracking-widest text-[#99582A]">Agendar</p>
              <h3 className="font-serif text-xl text-stone-900">{service.name}</h3>
              <div className="mt-3 flex items-center gap-2">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex flex-1 flex-col gap-1">
                    <div className={`h-1 rounded-full ${i + 1 <= step ? "bg-[#99582A]" : "bg-[#E7E2D9]"}`} />
                    <span className={`text-[10px] uppercase tracking-wide ${i + 1 === step ? "text-stone-900" : "text-stone-400"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProfessionalId("any")}
                    data-testid="booking-professional-any"
                    className={`rounded-2xl border p-4 text-left transition-transform duration-200 active:scale-[0.98] ${
                      professionalId === "any" ? "border-[#99582A] bg-[#F5EFE6] ring-1 ring-[#99582A]" : "border-[#E7E2D9] bg-white hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <Sparkles className="h-5 w-5 text-[#99582A]" />
                    <p className="mt-2 text-sm font-semibold text-stone-900">Qualquer disponível</p>
                    <p className="text-xs text-stone-500">Escolhemos por você</p>
                  </button>
                  {professionals.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfessionalId(p.id)}
                      data-testid={`booking-professional-${p.id}`}
                      className={`rounded-2xl border p-4 text-left transition-transform duration-200 active:scale-[0.98] ${
                        professionalId === p.id ? "border-[#99582A] bg-[#F5EFE6] ring-1 ring-[#99582A]" : "border-[#E7E2D9] bg-white hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5EFE6] font-serif text-stone-900">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <p className="mt-2 text-sm font-semibold text-stone-900">{p.name}</p>
                      <p className="text-xs text-stone-500">{p.specialty}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div data-testid="booking-date-calendar">
                  <Calendar
                    mode="single"
                    selected={date ? parseISODate(date) : undefined}
                    onSelect={(d) => {
                      setDate(d ? toISODate(d) : null);
                      setTime(null);
                    }}
                    disabled={disabledDays}
                    defaultMonth={parseISODate(today)}
                    className="mx-auto"
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  {slotsQ.isLoading || slotsQ.isFetching ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-xl bg-[#F1EAE0]" />
                      ))}
                    </div>
                  ) : slotsQ.data && slotsQ.data.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {slotsQ.data.map((t) => (
                        <Button
                          key={t}
                          variant={time === t ? "default" : "outline"}
                          onClick={() => setTime(t)}
                          data-testid={`slot-${t}`}
                          className="font-medium"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-stone-500">
                      Não há horários livres neste dia. Escolha outra data.
                    </p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-name">Seu nome</Label>
                    <Input
                      id="booking-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Como podemos te chamar?"
                      data-testid="booking-name-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-phone">WhatsApp</Label>
                    <Input
                      id="booking-phone"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="(11) 91234-5678"
                      inputMode="numeric"
                      data-testid="booking-phone-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-notes">Observações (opcional)</Label>
                    <Textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma preferência ou detalhe que devamos saber?"
                      rows={2}
                      data-testid="booking-notes-input"
                    />
                  </div>
                  <div className="rounded-2xl border border-[#E7E2D9] bg-[#F5EFE6] p-4 text-sm">
                    <p className="font-serif text-base text-stone-900">{service.name}</p>
                    <p className="mt-1 text-stone-600">
                      {date ? formatDayLabel(date) : "—"} às {time} · {professionalLabel}
                    </p>
                    <p className="mt-1 font-medium text-stone-900">{formatBRL(service.price_cents)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#E7E2D9] px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                data-testid="booking-back-button"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance}
                  data-testid="booking-next-button"
                  className="active:scale-[0.98]"
                >
                  Continuar <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => book.mutate()}
                  disabled={!canSubmit || book.isPending}
                  data-testid="booking-submit-button"
                  className="active:scale-[0.98]"
                >
                  {book.isPending ? "Confirmando..." : "Confirmar agendamento"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
