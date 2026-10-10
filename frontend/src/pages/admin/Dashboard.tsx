import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Check, Clock, TrendingUp, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatBRL, STATUS_LABEL } from "@/lib/format";
import type { Appointment, Metrics } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function statusBadge(status: string) {
  if (status === "confirmed") return <Badge className="rounded-full bg-[#F8EBDD] text-[#7C3E1D] hover:bg-[#F8EBDD]">{STATUS_LABEL[status]}</Badge>;
  if (status === "completed") return <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="destructive" className="rounded-full">{STATUS_LABEL[status]}</Badge>;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const metricsQ = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => apiGet<Metrics>("/appointments/metrics"),
    refetchInterval: 30000,
  });
  const upcomingQ = useQuery({
    queryKey: ["admin", "appointments", "upcoming"],
    queryFn: () => apiGet<Appointment[]>("/appointments?scope=upcoming"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Appointment>(`/appointments/${id}`, { status }),
    onSuccess: (_appt, vars) => {
      toast.success(vars.status === "completed" ? "Atendimento concluído!" : "Agendamento cancelado.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível atualizar o agendamento")),
  });

  const cards = [
    { label: "Agendamentos hoje", value: metricsQ.data?.today_count, icon: CalendarCheck, testid: "metric-today-count" },
    { label: "Faturamento hoje", value: metricsQ.data ? formatBRL(metricsQ.data.today_revenue_cents) : undefined, icon: Wallet, testid: "metric-today-revenue" },
    { label: "Faturamento do mês", value: metricsQ.data ? formatBRL(metricsQ.data.month_revenue_cents) : undefined, icon: TrendingUp, testid: "metric-month-revenue" },
    { label: "Clientes no mês", value: metricsQ.data?.month_customers, icon: Users, testid: "metric-month-customers" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">Visão geral do seu studio — atualizada a cada 30 segundos.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]" data-testid={c.testid}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5EFE6]">
                <c.icon className="h-5 w-5 text-[#99582A]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-stone-500">{c.label}</p>
                {c.value === undefined ? (
                  <div className="mt-1 h-6 w-20 animate-pulse rounded-lg bg-[#F1EAE0]" />
                ) : (
                  <p className="truncate font-serif text-2xl text-stone-900">{c.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's agenda */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl text-stone-900">
            <Clock className="h-5 w-5 text-[#99582A]" /> Agenda de hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {metricsQ.data && metricsQ.data.today_appointments.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500" data-testid="dashboard-today-empty">
              Nenhum atendimento agendado para hoje.
            </p>
          )}
          {metricsQ.data?.today_appointments.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7E2D9] p-3"
              data-testid={`appointment-row-${a.id}`}
            >
              <p className="font-serif text-xl text-stone-900">{a.time}</p>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">{a.service_name}</p>
                <p className="truncate text-xs text-stone-500">
                  {a.customer_name} · {a.professional_name ?? "A definir"} · {formatBRL(a.price_cents)}
                </p>
              </div>
              {statusBadge(a.status)}
              {a.status === "confirmed" && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus.mutate({ id: a.id, status: "completed" })}
                    data-testid={`appointment-complete-${a.id}`}
                  >
                    <Check className="h-4 w-4" /> Concluir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatus.mutate({ id: a.id, status: "cancelled" })}
                    className="text-destructive hover:text-destructive"
                    data-testid={`appointment-cancel-${a.id}`}
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">Próximos dias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingQ.data && upcomingQ.data.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">Nenhum agendamento futuro por enquanto.</p>
          )}
          {upcomingQ.data?.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-[#E7E2D9] p-3" data-testid={`appointment-row-${a.id}`}>
              <p className="w-24 shrink-0 text-sm font-medium text-stone-900">{a.date.split("-").reverse().slice(0, 2).join("/")}</p>
              <p className="w-12 shrink-0 font-serif text-lg text-stone-900">{a.time}</p>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-stone-900">{a.service_name}</p>
                <p className="truncate text-xs text-stone-500">
                  {a.customer_name} · {a.professional_name ?? "A definir"}
                </p>
              </div>
              {statusBadge(a.status)}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
