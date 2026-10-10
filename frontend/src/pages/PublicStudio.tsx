import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, MapPin, Phone, Sparkles } from "lucide-react";
import { ApiError, apiGet } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { PublicStudio, Service } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingModal from "@/components/BookingModal";

const CATEGORY_TAGLINES: Record<string, string> = {
  Unhas: "Beleza, cuidado e perfeição até a ponta dos dedos.",
  "Estética Facial": "Pele luminosa, olhar renovado, você em paz.",
  "Cílios & Sobrancelhas": "Um olhar marcante em poucos minutos.",
};

function joinPt(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export default function PublicStudio() {
  const { slug } = useParams<{ slug: string }>();
  const q = useQuery({
    queryKey: ["public", "studio", slug],
    queryFn: () => apiGet<PublicStudio>(`/public/studios/${slug}`),
    retry: false,
    enabled: !!slug,
  });

  const [entered, setEntered] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [category, setCategory] = useState("Todas");
  const [tab, setTab] = useState("services");
  const [booking, setBooking] = useState<Service | null>(null);

  const data = q.data;
  const notFound = q.error instanceof ApiError && q.error.status === 404;

  if (notFound) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[#1A1715] px-6 text-center text-[#FAF7F2]">
        <p className="text-2xl text-[#D4A373]">✦</p>
        <h1 className="mt-4 font-serif text-4xl">Studio não encontrado</h1>
        <p className="mt-2 text-sm text-stone-400">O link que você abriu não corresponde a nenhum studio Beauté.</p>
        <Link to="/" className={buttonVariants({ variant: "outline", className: "mt-8" })}>
          Conhecer a plataforma Beauté
        </Link>
      </div>
    );
  }

  const studioName = data?.name ?? "Beauté Studio";
  const heading = category !== "Todas" ? category : studioName;
  const tagline =
    category !== "Todas" ? CATEGORY_TAGLINES[category] ?? data?.tagline ?? "" : data?.tagline ?? "";
  const filteredServices =
    data?.services.filter((s) => category === "Todas" || s.category === category) ?? [];
  const professionalNames = data?.professionals.map((p) => p.name) ?? [];

  const enterCatalog = () => {
    setEntered(true);
    setTimeout(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  return (
    <div className="min-h-svh bg-[#FAF7F2]">
      {/* Splash entrance — cinematic, like the reference HTML */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1715] px-6 text-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="animate-float-slow text-2xl text-[#D4A373]">✦</p>
              <h1 className="mt-5 font-serif text-6xl text-[#FAF7F2] sm:text-7xl">{studioName.split(" ")[0]}</h1>
              <p className="mt-3 text-xs uppercase tracking-[0.45em] text-[#D4A373]">Studio de Beleza</p>
              <p className="mt-8 max-w-xs text-sm text-stone-400">{data?.tagline ?? "Sua melhor versão, todos os dias."}</p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  onClick={enterCatalog}
                  className="h-12 rounded-full bg-[#99582A] px-8 text-sm font-semibold tracking-wide text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
                  data-testid="splash-enter-button"
                >
                  ENTRAR &nbsp;⟶
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEntered(true);
                    setAboutOpen(true);
                  }}
                  className="h-12 rounded-full border-stone-600 bg-transparent px-8 text-sm font-semibold tracking-wide text-[#FAF7F2] hover:bg-stone-800 hover:text-[#FAF7F2] active:scale-[0.98]"
                  data-testid="splash-about-button"
                >
                  CONHECER O STUDIO
                </Button>
              </div>
            </motion.div>
            <p className="absolute bottom-8 text-[10px] uppercase tracking-[0.3em] text-stone-500">
              Toque para continuar
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catalog */}
      <main id="catalogo" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <motion.header
          className="pt-14 text-center sm:pt-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs uppercase tracking-[0.35em] text-[#99582A]">✦ Studio de Beleza ✦</p>
          {q.isLoading ? (
            <div className="mx-auto mt-6 h-12 w-64 animate-pulse rounded-2xl bg-[#F1EAE0]" />
          ) : (
            <>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-stone-900 sm:text-5xl">{heading}</h1>
              <p className="mt-3 text-stone-500">{tagline}</p>
            </>
          )}
          {data && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {["Todas", ...data.categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  data-testid={`category-chip-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-all duration-200 active:scale-[0.98] ${
                    category === c
                      ? "border-[#99582A] bg-[#99582A] text-white"
                      : "border-[#E7E2D9] bg-white text-stone-600 hover:border-[#99582A] hover:text-[#99582A]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </motion.header>

        {data && (
          <div className="mt-8">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mx-auto flex w-fit" data-testid="catalog-tabs">
                <TabsTrigger value="services" data-testid="services-tab">Serviços</TabsTrigger>
                <TabsTrigger value="professionals" data-testid="professionals-tab">Profissionais</TabsTrigger>
              </TabsList>

              <p className="mt-6 text-center text-sm text-stone-500">
                Atendimento realizado por <b className="text-stone-800">{joinPt(professionalNames) || "nossa equipe"}</b>
              </p>

              <TabsContent value="services" className="mt-6 space-y-5">
                {filteredServices.length === 0 && (
                  <p className="py-10 text-center text-sm text-stone-500">
                    Nenhum serviço nesta categoria ainda — fale com o studio pelo WhatsApp.
                  </p>
                )}
                {filteredServices.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card
                      className="overflow-hidden rounded-3xl border-[#E7E2D9] bg-[#FFFDFC] transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
                      data-testid={`service-card-${s.id}`}
                    >
                      <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-[#F5EFE6] via-[#EFE3D3] to-[#E7D7C3]">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Sparkles className="h-8 w-8 text-[#D4A373]" />
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="font-serif text-xl text-stone-900">{s.name}</CardTitle>
                          <Badge variant="outline" className="shrink-0 gap-1 text-xs text-stone-500">
                            <Clock className="h-3 w-3" /> {s.duration_min} min
                          </Badge>
                        </div>
                        {s.description && <CardDescription className="text-sm leading-relaxed">{s.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="flex items-end justify-between">
                        <div>
                          <small className="text-xs text-stone-500">A partir de</small>
                          <p className="font-serif text-2xl text-stone-900">{formatBRL(s.price_cents)}</p>
                        </div>
                        <Button
                          onClick={() => setBooking(s)}
                          className="rounded-full bg-[#99582A] px-6 text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
                          data-testid={`book-service-${s.id}`}
                        >
                          Agendar
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="professionals" className="mt-6 grid gap-5 sm:grid-cols-2">
                {data.professionals.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]" data-testid={`professional-card-${p.id}`}>
                      <CardContent className="flex flex-col items-center p-6 text-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-[#E7C8A0]" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F5EFE6] font-serif text-2xl text-stone-900">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <h3 className="mt-4 font-serif text-xl text-stone-900">{p.name}</h3>
                        <p className="text-xs uppercase tracking-wide text-[#99582A]">{p.specialty}</p>
                        {p.bio && <p className="mt-3 text-sm leading-relaxed text-stone-500">{p.bio}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {data && (
          <div className="mt-10 rounded-2xl border border-dashed border-[#D4A373] bg-[#F8EBDD]/60 p-5 text-center text-sm text-stone-600">
            <b className="text-stone-900">IMPORTANTE</b>
            <br />
            Valores podem variar conforme o comprimento, detalhes e técnicas escolhidas. Tolerância de atraso de 10
            minutos. Reagendamento com 24h de antecedência.
          </div>
        )}

        <footer className="mt-14 border-t border-[#E7E2D9] pt-6 text-center text-sm text-stone-500">
          {data?.address && (
            <p className="flex items-center justify-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#99582A]" /> {data.address}
            </p>
          )}
          {data?.phone && (
            <p className="mt-1 flex items-center justify-center gap-1.5">
              <Phone className="h-4 w-4 text-[#99582A]" /> {data.phone}
            </p>
          )}
          <p className="mt-4 text-xs">
            Feito com <Link to="/" className="font-medium text-[#99582A] hover:underline">Beauté</Link> — sistema para
            studios de beleza
          </p>
        </footer>
      </main>

      {/* About modal */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stone-900">{studioName}</DialogTitle>
            <DialogDescription>{data?.tagline}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-stone-600">
            <p>{data?.about || "Um espaço criado para realçar a sua beleza, com atendimento personalizado e produtos de alta qualidade."}</p>
            {data?.address && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#99582A]" /> {data.address}
              </p>
            )}
            {data?.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#99582A]" /> {data.phone}
              </p>
            )}
          </div>
          <Button onClick={enterCatalog} className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]" data-testid="about-catalog-button">
            Ver serviços <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Booking flow */}
      {booking && data && (
        <BookingModal
          slug={data.slug}
          service={booking}
          professionals={data.professionals}
          hours={data.hours}
          today={data.today}
          open={!!booking}
          onOpenChange={(o) => {
            if (!o) setBooking(null);
          }}
        />
      )}
    </div>
  );
}
