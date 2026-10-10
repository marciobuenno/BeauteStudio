import { NavLink, Navigate, Outlet } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  CalendarRange,
  Clock,
  Copy,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { endSession } from "@/lib/session";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, testid: "admin-nav-dashboard", end: true },
  { to: "/admin/agenda", label: "Agenda da semana", icon: CalendarRange, testid: "admin-nav-agenda", end: false },
  { to: "/admin/appointments", label: "Agendamentos", icon: CalendarDays, testid: "admin-nav-appointments", end: false },
  { to: "/admin/reminders", label: "Avisos WhatsApp", icon: BellRing, testid: "admin-nav-reminders", end: false },
  { to: "/admin/reports", label: "Relatórios", icon: BarChart3, testid: "admin-nav-reports", end: false },
  { to: "/admin/services", label: "Serviços", icon: Sparkles, testid: "admin-nav-services", end: false },
  { to: "/admin/professionals", label: "Profissionais", icon: Users, testid: "admin-nav-professionals", end: false },
  { to: "/admin/schedule", label: "Horários", icon: Clock, testid: "admin-nav-schedule", end: false },
  { to: "/admin/settings", label: "Configurações", icon: Settings, testid: "admin-nav-settings", end: false },
];

function PlanBadge({ plan, expires }: { plan: string; expires: string | null }) {
  const expired = plan === "trial" && expires ? new Date(expires) < new Date() : false;
  if (plan === "active") {
    return <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">Assinatura ativa</Badge>;
  }
  if (expired) {
    return <Badge variant="destructive" className="rounded-full">Teste expirado</Badge>;
  }
  return <Badge variant="secondary" className="rounded-full">Teste grátis{expires ? ` até ${formatDateBR(expires)}` : ""}</Badge>;
}

export default function AdminLayout() {
  const me = useMe();

  const data = me.data;

  if (me.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAF7F2]">
        <p className="animate-pulse font-serif text-3xl text-stone-400">
          Beauté<span className="text-[#D4A373]">✦</span>
        </p>
      </div>
    );
  }
  if (me.error || !data) return <Navigate to="/login" replace />;

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/b/${data.slug}`);
    toast.success("Link público copiado!");
  };

  return (
    <div className="min-h-svh bg-[#FAF7F2]">
      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-[#E7E2D9] bg-[#F5EFE6] p-5 md:flex">
          <NavLink to="/" className="font-serif text-2xl tracking-tight text-stone-900">
            Beauté<span className="text-[#D4A373]">✦</span>
          </NavLink>
          <p className="mt-1 truncate text-sm text-stone-500">{data.studio_name}</p>

          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150",
                    isActive
                      ? "bg-[#99582A] font-medium text-white"
                      : "text-stone-600 hover:bg-[#F1EAE0] hover:text-stone-900",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <PlanBadge plan={data.plan} expires={data.plan_expires_at} />
            <Button
              variant="outline"
              size="sm"
              onClick={copyPublicLink}
              className="w-full justify-start rounded-xl"
              data-testid="admin-copy-link-button"
            >
              <Copy className="h-4 w-4" /> Copiar link público
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => endSession()}
              className="w-full justify-start rounded-xl text-stone-500 hover:text-stone-900"
              data-testid="admin-logout-button"
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 border-b border-[#E7E2D9] bg-[#FAF7F2]/85 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-serif text-xl text-stone-900">
                Beauté<span className="text-[#D4A373]">✦</span>
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={copyPublicLink} aria-label="Copiar link público" data-testid="admin-copy-link-button-mobile">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => endSession()}
                  aria-label="Sair"
                  data-testid="admin-logout-button-mobile"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  data-testid={`${item.testid}-mobile`}
                  className={({ isActive }) =>
                    cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs",
                      isActive ? "bg-[#99582A] font-medium text-white" : "bg-[#F1EAE0] text-stone-600",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="p-4 pb-16 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
