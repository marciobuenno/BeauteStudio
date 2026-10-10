import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageCircle, RotateCcw } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { formatBRL, parseISODate, toISODate, weekdayLabel } from "@/lib/format";
import { confirmationMessage, waLink } from "@/lib/whatsapp";
import type { Appointment, WeekAgenda } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Professional } from "@/types";

function mondayOf(iso: string): string {
  const date = parseISODate(iso);
  const dayOffset = (date.getDay() + 6) % 7; // JS Sunday=0 -> Monday-based offset
  date.setDate(date.getDate() - dayOffset);
  return toISODate(date);
}

function shiftWeek(iso: string, weeks: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + weeks * 7);
  return toISODate(date);
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-[#D4A373] bg-[#F8EBDD]",
  completed: "border-green-300 bg-green-50",
  cancelled: "border-red-200 bg-red-50 opacity-60",
};

export default function Agenda() {
  const me = useMe();
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState("all");

  const start = weekStart ?? (me.data ? mondayOf(me.data.today) : null);

  const prosQ = useQuery({
    queryKey: ["admin", "professionals"],
    queryFn: () => apiGet<Professional[]>("/professionals"),
  });

  const weekQ = useQuery({
    queryKey: ["admin", "week", start],
    queryFn: () => apiGet<WeekAgenda>(`/appointments/week?start=${start}`),
    enabled: !!start,
  });

  const professionals = prosQ.data ?? [];
  const week = weekQ.data;
  const studioName = me.data?.studio_name ?? "nosso studio";

  const visible = (appts: Appointment[]) =>
    professionalId === "all" ? appts : appts.filter((a) => a.professional_id === professionalId);

  const weekRevenue =
    week?.days.reduce(
      (sum, day) =>
        sum +
        visible(day.appointments)
          .filter((a) => a.status !== "cancelled")
          .reduce((s, a) => s + a.price_cents, 0),
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900">Agenda da semana</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sua agenda de papel, lado a lado — toque num atendimento para avisar a cliente no WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger className="w-52" data-testid="agenda-professional-filter">
              <SelectValue>
                {(v) =>
                  v === "all" ? "Todas as profissionais" : professionals.find((p) => p.id === v)?.name ?? "Profissional"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as profissionais</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Semana anterior"
            onClick={() => start && setWeekStart(shiftWeek(start, -1))}
            data-testid="agenda-prev-week-button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => me.data && setWeekStart(mondayOf(me.data.today))}
            data-testid="agenda-this-week-button"
          >
            <RotateCcw className="h-4 w-4" /> Esta semana
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Próxima semana"
            onClick={() => start && setWeekStart(shiftWeek(start, 1))}
            data-testid="agenda-next-week-button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {week && (
        <p className="text-sm text-stone-500" data-testid="agenda-week-summary">
          Semana de <b className="text-stone-800">{week.start.split("-").reverse().slice(0, 2).join("/")}</b> a{" "}
          <b className="text-stone-800">{week.end.split("-").reverse().slice(0, 2).join("/")}</b> · faturamento previsto{" "}
          <b className="text-stone-800">{formatBRL(weekRevenue)}</b>
        </p>
      )}

      {/* Week board */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {weekQ.isLoading &&
          Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-[#F1EAE0]" />)}
        {week?.days.map((day) => {
          const appts = visible(day.appointments);
          const isToday = day.date === week.today;
          return (
            <Card
              key={day.date}
              className={`rounded-3xl border-[#E7E2D9] ${isToday ? "border-[#99582A] bg-[#FFFDFC] ring-1 ring-[#99582A]" : "bg-[#FFFDFC]"}`}
              data-testid={`agenda-day-${day.date}`}
            >
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">{weekdayLabel(day.weekday)}</p>
                    <p className="font-serif text-2xl text-stone-900">{day.date.slice(8, 10)}</p>
                  </div>
                  {isToday && <Badge className="rounded-full bg-[#99582A] text-white hover:bg-[#99582A]">hoje</Badge>}
                </div>

                <div className="mt-3 space-y-2">
                  {day.closed && (
                    <p className="rounded-xl bg-[#F1EAE0] px-2 py-3 text-center text-xs text-stone-500">Fechado</p>
                  )}
                  {!day.closed && appts.length === 0 && (
                    <p className="py-6 text-center text-xs text-stone-400">Livre</p>
                  )}
                  {appts.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-2.5 transition-transform duration-200 hover:-translate-y-0.5 ${STATUS_STYLE[a.status] ?? "border-[#E7E2D9]"}`}
                      data-testid={`agenda-appointment-${a.id}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-serif text-lg text-stone-900">{a.time}</p>
                        <a
                          href={waLink(a.customer_phone, confirmationMessage(a, studioName))}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Avisar ${a.customer_name} no WhatsApp`}
                          className="rounded-full p-1 text-green-700 transition-colors duration-150 hover:bg-green-100"
                          data-testid={`agenda-whatsapp-${a.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </div>
                      <p className="truncate text-xs font-medium text-stone-900">{a.customer_name}</p>
                      <p className="truncate text-xs text-stone-500">{a.service_name}</p>
                      <p className="truncate text-[11px] text-stone-400">
                        {a.professional_name ?? "A definir"} · {formatBRL(a.price_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
