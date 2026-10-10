import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BadgePercent, CalendarRange, TrendingUp, Users, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import type { RevenueReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BAR_COLORS = ["#99582A", "#D4A373", "#7C3E1D", "#E7C8A0", "#B07D56", "#8C6239"];

function monthsAgo(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// Last day of the month `iso` falls in — future bookings this month count as expected revenue.
function endOfMonth(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).toISOString().slice(0, 10);
}

export default function Reports() {
  const me = useMe();
  const today = me.data?.today ?? new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(() => monthsAgo(today, 6));
  const [end, setEnd] = useState(() => endOfMonth(today));

  const report = useQuery({
    queryKey: ["admin", "report", start, end],
    queryFn: () => apiGet<RevenueReport>(`/reports/revenue?start=${start}&end=${end}`),
    enabled: !!me.data,
  });

  const data = report.data;
  const reaisTick = (cents: number) => `R$ ${Math.round(cents / 100)}`;
  const tooltipFormatter = (value: number) => formatBRL(value);

  const cards = [
    { label: "Faturamento no período", value: data ? formatBRL(data.total_revenue_cents) : undefined, icon: TrendingUp, testid: "report-total-revenue" },
    { label: "Atendimentos", value: data?.total_count, icon: CalendarRange, testid: "report-total-count" },
    { label: "Ticket médio", value: data ? formatBRL(data.avg_ticket_cents) : undefined, icon: BadgePercent, testid: "report-avg-ticket" },
    { label: "Clientes atendidas", value: data?.customers, icon: Users, testid: "report-customers" },
    { label: "Cancelamentos", value: data?.cancelled_count, icon: XCircle, testid: "report-cancelled" },
  ];

  const quickRanges = [
    { label: "30 dias", months: 1 },
    { label: "3 meses", months: 3 },
    { label: "6 meses", months: 6 },
    { label: "12 meses", months: 12 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">Relatório financeiro</h1>
        <p className="mt-1 text-sm text-stone-500">
          Onde o seu dinheiro é feito — por serviço, por profissional e ao longo dos meses.
        </p>
      </div>

      {/* Period filter */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="report-start">De</Label>
            <Input
              id="report-start"
              type="date"
              value={start}
              max={end}
              onChange={(e) => setStart(e.target.value)}
              className="w-40"
              data-testid="report-start-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-end">Até</Label>
            <Input
              id="report-end"
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
              className="w-40"
              data-testid="report-end-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setStart(monthsAgo(today, range.months));
                  setEnd(endOfMonth(today));
                }}
                data-testid={`report-range-${range.months}`}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]" data-testid={c.testid}>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EFE6]">
                <c.icon className="h-5 w-5 text-[#99582A]" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-stone-500">{c.label}</p>
              {c.value === undefined ? (
                <div className="mt-1 h-6 w-20 animate-pulse rounded-lg bg-[#F1EAE0]" />
              ) : (
                <p className="font-serif text-2xl text-stone-900">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly evolution */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">Evolução mensal</CardTitle>
          <CardDescription>Faturamento mês a mês no período selecionado.</CardDescription>
        </CardHeader>
        <CardContent className="h-72" data-testid="report-monthly-chart">
          {data && data.by_month.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.by_month} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D9" vertical={false} />
                <XAxis dataKey="label" stroke="#57534E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#57534E" fontSize={12} tickFormatter={reaisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelStyle={{ color: "#1C1917" }}
                  contentStyle={{ borderRadius: 16, border: "1px solid #E7E2D9", background: "#FFFDFC" }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue_cents"
                  name="Faturamento"
                  stroke="#99582A"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#99582A" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-stone-500" data-testid="report-monthly-empty">
              Sem faturamento registrado neste período.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {([
          { title: "Faturamento por serviço", desc: "Quais serviços trazem mais receita.", rows: data?.by_service, testid: "report-service-chart" },
          { title: "Faturamento por profissional", desc: "Quem mais fatura no seu studio.", rows: data?.by_professional, testid: "report-professional-chart" },
        ] as const).map((block) => (
          <Card key={block.title} className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-stone-900">{block.title}</CardTitle>
              <CardDescription>{block.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" data-testid={block.testid}>
              {block.rows && block.rows.length > 0 ? (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...block.rows]} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D9" vertical={false} />
                        <XAxis dataKey="label" stroke="#57534E" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                        <YAxis stroke="#57534E" fontSize={12} tickFormatter={reaisTick} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={tooltipFormatter}
                          contentStyle={{ borderRadius: 16, border: "1px solid #E7E2D9", background: "#FFFDFC" }}
                        />
                        <Bar dataKey="revenue_cents" name="Faturamento" radius={[8, 8, 0, 0]}>
                          {block.rows.map((_row, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {block.rows.slice(0, 6).map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm">
                        <span className="truncate text-stone-600">{row.label}</span>
                        <span className="shrink-0 font-medium text-stone-900">
                          {formatBRL(row.revenue_cents)} <span className="text-xs text-stone-400">({row.count}x)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-16 text-center text-sm text-stone-500">Nada registrado neste período.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
