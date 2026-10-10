import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  Clock,
  Link2,
  Sparkles,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
const DEMO_SLUG = "beaute-studio-1";
const HERO_IMG =
  "https://images.unsplash.com/photo-1781513144825-aa1e284c5950?crop=entropy&cs=srgb&fm=jpg&q=85";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agenda inteligente",
    desc: "Agendamentos organizados por dia, com confirmação, conclusão e cancelamento em um toque.",
  },
  {
    icon: Clock,
    title: "Horários por dia da semana",
    desc: "Configure abertura, fechamento e dias de folga — os horários livres aparecem sozinhos para a cliente.",
  },
  {
    icon: Users,
    title: "Múltiplos profissionais",
    desc: "Cada profissional com sua agenda, especialidades e foto no catálogo público.",
  },
  {
    icon: Sparkles,
    title: "Catálogo público elegante",
    desc: "Uma página linda com seus serviços, preços e fotos — sua vitrine digital.",
  },
  {
    icon: Link2,
    title: "Link exclusivo para clientes",
    desc: "Compartilhe beaute.app/b/seu-studio na bio do Instagram e receba agendamentos direto.",
  },
  {
    icon: BarChart3,
    title: "Painel de controle",
    desc: "Faturamento estimado, ocupação da agenda e clientes do mês em tempo real.",
  },
];

const PLANS = [
  {
    name: "Mensal",
    price: "R$ 69",
    period: "/mês",
    desc: "Ideal para quem está começando.",
    features: ["Agenda ilimitada", "Serviços e profissionais ilimitados", "Página pública exclusiva", "Suporte por WhatsApp"],
    highlight: false,
  },
  {
    name: "Anual",
    price: "R$ 590",
    period: "/ano",
    desc: "Economize 2 meses por ano.",
    features: [
      "Tudo do plano mensal",
      "2 meses grátis",
      "Prioridade em novidades",
      "Relatórios avançados",
    ],
    highlight: true,
  },
];

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export default function Landing() {
  return (
    <div className="min-h-svh bg-[#FAF7F2] text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E7E2D9] bg-[#FAF7F2]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-serif text-2xl tracking-tight" data-testid="landing-logo-link">
            Beauté<span className="text-[#D4A373]">✦</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
            <a href="#recursos" className="hover:text-stone-900">Funcionalidades</a>
            <a href="#planos" className="hover:text-stone-900">Preços</a>
            <Link to={`/b/${DEMO_SLUG}`} className="hover:text-stone-900">Demonstração</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" data-testid="nav-login-link" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Entrar
            </Link>
            <Link to="/register" data-testid="nav-register-button" className={buttonVariants({ size: "sm", className: "rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]" })}>
              Cadastrar Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <Badge className="rounded-full bg-[#F8EBDD] text-[#7C3E1D] hover:bg-[#F8EBDD]">Novo · SaaS para studios de beleza</Badge>
          <h1 className="mt-6 font-serif text-4xl leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            O sistema de studio mais elegante do Brasil.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-stone-600">
            Encante clientes antes mesmo do atendimento: catálogo público com sua cara, agendamento online e agenda
            sob controle — tudo em um link só.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              data-testid="hero-register-button"
              className={buttonVariants({ className: "h-12 rounded-full bg-[#99582A] px-8 text-white hover:bg-[#7C3E1D] active:scale-[0.98]" })}
            >
              Criar meu studio <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to={`/b/${DEMO_SLUG}`}
              data-testid="hero-demo-button"
              className={buttonVariants({ variant: "outline", className: "h-12 rounded-full px-8" })}
            >
              Ver demonstração
            </Link>
          </div>
          <p className="mt-5 text-sm text-stone-500">14 dias de teste grátis · sem cartão de crédito</p>
        </motion.div>

        <motion.div
          className="animate-float-slow"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          data-testid="hero-preview-card"
        >
          <div className="overflow-hidden rounded-3xl border border-[#E7E2D9] bg-white shadow-xl">
            <img src={HERO_IMG} alt="Interior de studio de beleza" className="h-52 w-full object-cover" />
            <div className="p-6">
              <p className="text-xs uppercase tracking-widest text-[#99582A]">Beauté Clinic Studio · demonstração</p>
              <h3 className="mt-1 font-serif text-2xl">Unhas</h3>
              <p className="text-sm text-stone-500">Beleza, cuidado e perfeição até a ponta dos dedos.</p>
              <div className="mt-4 space-y-3">
                {[
                  { name: "Alongamento em Gel", price: "R$ 180" },
                  { name: "Manicure Tradicional", price: "R$ 55" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-2xl border border-[#E7E2D9] bg-[#FFFDFC] p-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{s.name}</p>
                      <p className="text-xs text-stone-500">A partir de {s.price}</p>
                    </div>
                    <Link to={`/b/${DEMO_SLUG}`} className={buttonVariants({ size: "sm", variant: "outline", className: "rounded-full" })}>
                      Agendar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features bento */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <motion.div {...fade} className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#99582A]">✦ Funcionalidades</p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Tudo que seu studio precisa, nada que complique</h2>
        </motion.div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }}>
              <Card className="h-full rounded-3xl border-[#E7E2D9] bg-[#FFFDFC] transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EFE6]">
                    <f.icon className="h-5 w-5 text-[#99582A]" />
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-stone-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <motion.div {...fade} className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#99582A]">✦ Planos</p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Comece grátis, escale quando quiser</h2>
          <p className="mt-3 text-stone-600">14 dias de teste grátis em qualquer plano. Sem cartão de crédito.</p>
        </motion.div>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <motion.div key={plan.name} {...fade}>
              <Card
                className={`h-full rounded-3xl border bg-[#FFFDFC] ${plan.highlight ? "border-[#99582A] shadow-lg ring-1 ring-[#99582A]" : "border-[#E7E2D9]"}`}
              >
                <CardContent className="flex h-full flex-col p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl">{plan.name}</h3>
                    {plan.highlight && (
                      <Badge className="rounded-full bg-[#F8EBDD] text-[#7C3E1D] hover:bg-[#F8EBDD]">2 meses grátis</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-stone-500">{plan.desc}</p>
                  <p className="mt-6">
                    <span className="font-serif text-5xl">{plan.price}</span>
                    <span className="text-stone-500">{plan.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-stone-600">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[#99582A]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    data-testid={`plan-${plan.name.toLowerCase()}-button`}
                    className={buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                      className: `mt-8 w-full rounded-full ${plan.highlight ? "bg-[#99582A] text-white hover:bg-[#7C3E1D]" : ""}`,
                    })}
                  >
                    Começar teste grátis
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <motion.div {...fade} className="rounded-3xl bg-[#1A1715] px-6 py-16 text-center sm:px-12">
          <p className="text-2xl text-[#D4A373]">✦</p>
          <h2 className="mx-auto mt-4 max-w-xl font-serif text-3xl tracking-tight text-[#FAF7F2] sm:text-4xl">
            Comece a lucrar com o seu Studio hoje
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-400">
            Crie sua página pública em minutos e receba agendamentos ainda esta semana.
          </p>
          <Link
            to="/register"
            data-testid="cta-register-button"
            className={buttonVariants({ className: "mt-8 h-12 rounded-full bg-[#D4A373] px-8 font-semibold text-[#1C1917] hover:bg-[#E7C8A0] active:scale-[0.98]" })}
          >
            Cadastrar meu studio gratuitamente
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-[#E7E2D9] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-stone-500 sm:flex-row sm:px-6 lg:px-8">
          <p className="font-serif text-lg text-stone-900">Beauté<span className="text-[#D4A373]">✦</span></p>
          <p>© 2026 Beauté — Sistema para studios de beleza</p>
        </div>
      </footer>
    </div>
  );
}
