import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { useMe } from "@/lib/queries";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { BillingConfig, Studio } from "@/types";
import PixDialog from "@/components/PixDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsAdmin() {
  const qc = useQueryClient();
  const me = useMe();
  const studioQ = useQuery({ queryKey: ["admin", "studio"], queryFn: () => apiGet<Studio>("/studio/me") });
  const billingQ = useQuery({ queryKey: ["billing", "config"], queryFn: () => apiGet<BillingConfig>("/billing/config") });
  const [pixOpen, setPixOpen] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", phone: "", address: "", about: "" });

  useEffect(() => {
    if (studioQ.data) {
      setForm({
        name: studioQ.data.name,
        tagline: studioQ.data.tagline,
        phone: studioQ.data.phone,
        address: studioQ.data.address,
        about: studioQ.data.about,
      });
    }
  }, [studioQ.data]);

  const save = useMutation({
    mutationFn: () =>
      apiPatch<Studio>("/studio/me", {
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        about: form.about.trim(),
      }),
    onSuccess: () => {
      toast.success("Dados do studio salvos!");
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["admin", "studio"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar os dados")),
  });

  if (!me.data) return null;  const publicUrl = `${window.location.origin}/b/${me.data.slug}`;
  const planExpired = me.data.plan === "trial" && me.data.plan_expires_at ? new Date(me.data.plan_expires_at) < new Date() : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">Configurações</h1>
        <p className="mt-1 text-sm text-stone-500">Dados do studio, link público e assinatura.</p>
      </div>

      {/* Public link */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">Link público de agendamento</CardTitle>
          <CardDescription>Compartilhe na bio do Instagram, WhatsApp ou Google — suas clientes agendam sozinhas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input readOnly value={publicUrl} className="min-w-0 flex-1" data-testid="public-link-input" />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              toast.success("Link copiado!");
            }}
            data-testid="copy-public-link-button"
          >
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(publicUrl, "_blank")}
            data-testid="open-public-link-button"
          >
            <ExternalLink className="h-4 w-4" /> Abrir
          </Button>
        </CardContent>
      </Card>

      {/* Studio data */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">Dados do studio</CardTitle>
          <CardDescription>Aparecem no splash e no rodapé da página pública.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Nome do studio</Label>
              <Input id="settings-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="settings-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-tagline">Frase do splash</Label>
              <Input id="settings-tagline" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Sua melhor versão, todos os dias." data-testid="settings-tagline-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-phone">WhatsApp</Label>
              <Input id="settings-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} data-testid="settings-phone-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-address">Endereço</Label>
              <Input id="settings-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Rua, número — cidade/UF" data-testid="settings-address-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-about">Sobre o studio (botão “Conhecer o studio”)</Label>
            <Textarea id="settings-about" rows={3} value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} data-testid="settings-about-input" />
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || form.name.trim().length < 2}
            className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
            data-testid="settings-save-button"
          >
            {save.isPending ? "Salvando..." : "Salvar dados"}
          </Button>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl text-stone-900">
            <Sparkles className="h-5 w-5 text-[#99582A]" /> Assinatura Beauté
          </CardTitle>
          <CardDescription>Seu studio continua no ar enquanto a assinatura estiver válida.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {me.data.plan === "active" ? (
                <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">Assinatura ativa</Badge>
              ) : planExpired ? (
                <Badge variant="destructive" className="rounded-full">Teste expirado</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">Teste grátis</Badge>
              )}
              {me.data.plan_expires_at && (
                <span className="text-sm text-stone-500">
                  válida até {formatDateBR(me.data.plan_expires_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              {billingQ.data?.enabled
                ? `Pix pelo Mercado Pago — ${formatBRL(billingQ.data.monthly_cents)}/mês ou ${formatBRL(billingQ.data.annual_cents)}/ano, com ativação automática.`
                : "Pagamento via Pix aguardando o Access Token do Mercado Pago."}
            </p>
          </div>
          <Button
            onClick={() => setPixOpen(true)}
            className="rounded-full bg-[#1C1917] text-[#FAF7F2] hover:bg-[#3B352E] active:scale-[0.98]"
            data-testid="plan-activate-button"
          >
            <QrCode className="h-4 w-4" />
            {me.data.plan === "active" ? "Renovar com Pix" : "Assinar com Pix"}
          </Button>
        </CardContent>
      </Card>

      <PixDialog
        open={pixOpen}
        onOpenChange={setPixOpen}
        ownerName={me.data.owner_name}
        ownerEmail={me.data.email}
        config={billingQ.data}
      />
    </div>
  );
}
