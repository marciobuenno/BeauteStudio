import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { useMe } from "@/lib/queries";
import { formatBRL, formatDayLabel } from "@/lib/format";
import { confirmationMessage, reminderMessage, waLink } from "@/lib/whatsapp";
import type { Appointment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reminders() {
  const qc = useQueryClient();
  const me = useMe();
  const studioName = me.data?.studio_name ?? "nosso studio";

  const tomorrowQ = useQuery({
    queryKey: ["admin", "appointments", "tomorrow"],
    queryFn: () => apiGet<Appointment[]>("/appointments?scope=tomorrow&status=confirmed"),
  });
  const todayQ = useQuery({
    queryKey: ["admin", "appointments", "today-confirmed"],
    queryFn: () => apiGet<Appointment[]>("/appointments?scope=today&status=confirmed"),
  });

  const markSent = useMutation({
    mutationFn: (id: string) => apiPost<Appointment>(`/appointments/${id}/reminder`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "appointments"] }),
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível marcar o lembrete")),
  });

  const sections = [
    {
      key: "tomorrow",
      title: "Lembretes de amanhã",
      description: "Confirme a presença das clientes de amanhã — um toque abre o WhatsApp com a mensagem escrita.",
      icon: BellRing,
      rows: tomorrowQ.data,
      buildMessage: (a: Appointment) => reminderMessage(a, studioName),
      cta: "Enviar lembrete",
    },
    {
      key: "today",
      title: "Confirmações de hoje",
      description: "Reenvie os detalhes do atendimento de hoje para quem precisar.",
      icon: MessageCircle,
      rows: todayQ.data,
      buildMessage: (a: Appointment) => confirmationMessage(a, studioName),
      cta: "Enviar detalhes",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">Avisos no WhatsApp</h1>
        <p className="mt-1 text-sm text-stone-500">
          Mensagens prontas para confirmar e lembrar suas clientes — sem digitar nada.
        </p>
      </div>

      {sections.map((section) => (
        <Card key={section.key} className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl text-stone-900">
              <section.icon className="h-5 w-5 text-[#99582A]" /> {section.title}
              {section.rows && section.rows.length > 0 && (
                <Badge variant="secondary" className="rounded-full">{section.rows.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {section.rows && section.rows.length === 0 && (
              <p className="py-8 text-center text-sm text-stone-500" data-testid={`reminders-${section.key}-empty`}>
                Nenhum atendimento confirmado nesta lista.
              </p>
            )}
            {section.rows?.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7E2D9] p-3"
                data-testid={`reminder-row-${a.id}`}
              >
                <p className="font-serif text-xl text-stone-900">{a.time}</p>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">{a.customer_name}</p>
                  <p className="truncate text-xs text-stone-500">
                    {a.service_name} · {formatDayLabel(a.date)} · {formatBRL(a.price_cents)}
                  </p>
                </div>
                {a.reminder_sent_at && (
                  <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">
                    <Check className="mr-1 h-3 w-3" /> Enviado
                  </Badge>
                )}
                <a
                  href={waLink(a.customer_phone, section.buildMessage(a))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => markSent.mutate(a.id)}
                  data-testid={`reminder-send-${a.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:bg-green-700 active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" /> {section.cta}
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <p className="rounded-2xl border border-dashed border-[#D4A373] bg-[#F8EBDD]/60 p-4 text-xs text-stone-600">
        <b className="text-stone-900">Como funciona:</b> o Beauté monta a mensagem e abre o WhatsApp já com o texto
        pronto no número da cliente — nada é enviado sem o seu toque, e não há custo nem cadastro extra.
      </p>
    </div>
  );
}
