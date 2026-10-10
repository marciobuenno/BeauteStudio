import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatBRL, formatDateBR, maskCpf } from "@/lib/format";
import type { BillingConfig, PixCharge, PixStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  ownerEmail: string;
  config: BillingConfig | undefined;
}

export default function PixDialog({ open, onOpenChange, ownerName, ownerEmail, config }: PixDialogProps) {
  const qc = useQueryClient();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [cpf, setCpf] = useState("");
  const [charge, setCharge] = useState<PixCharge | null>(null);

  const firstName = ownerName.trim().split(" ")[0] || "Studio";
  const lastName = ownerName.trim().split(" ").slice(1).join(" ") || "Beaute";

  const create = useMutation({
    mutationFn: () =>
      apiPost<PixCharge>("/billing/pix", {
        plan,
        payer_first_name: firstName,
        payer_last_name: lastName,
        payer_email: ownerEmail,
        cpf: cpf.replace(/\D/g, ""),
      }),
    onSuccess: (data) => setCharge(data),
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível gerar o Pix")),
  });

  // Pix is asynchronous: poll the backend, which re-checks with Mercado Pago server-side.
  const status = useQuery({
    queryKey: ["billing", "pix", charge?.payment_id],
    queryFn: () => apiGet<PixStatus>(`/billing/pix/${charge!.payment_id}`),
    enabled: open && !!charge,
    refetchInterval: (query) => (query.state.data?.approved ? false : 5000),
  });

  const approved = status.data?.approved === true;
  if (approved) qc.invalidateQueries({ queryKey: ["auth", "me"] });

  const reset = () => {
    setCharge(null);
    setCpf("");
  };

  const amountCents = plan === "annual" ? config?.annual_cents ?? 59000 : config?.monthly_cents ?? 6900;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto rounded-3xl border-[#E7E2D9]">
        {approved ? (
          <div className="flex flex-col items-center py-4 text-center" data-testid="pix-approved">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7]">
              <Check className="h-7 w-7 text-[#14532D]" />
            </div>
            <h3 className="mt-4 font-serif text-2xl text-stone-900">Pagamento aprovado!</h3>
            <p className="mt-1 text-sm text-stone-500">
              Sua assinatura Beauté está ativa
              {status.data?.plan_expires_at ? ` até ${formatDateBR(status.data.plan_expires_at)}` : ""}.
            </p>
            <Button
              className="mt-6 w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              data-testid="pix-approved-close-button"
            >
              Voltar ao painel
            </Button>
          </div>
        ) : charge ? (
          <div data-testid="pix-charge">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-stone-900">Pague com Pix</DialogTitle>
              <DialogDescription>
                {formatBRL(charge.amount_cents)} · {charge.plan === "annual" ? "Plano Anual" : "Plano Mensal"} — a
                ativação é automática logo após o pagamento.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {charge.qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${charge.qr_code_base64}`}
                  alt="QR Code do Pix"
                  className="h-56 w-56 rounded-2xl border border-[#E7E2D9] bg-white p-2"
                  data-testid="pix-qr-image"
                />
              )}
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(charge.qr_code ?? "");
                  toast.success("Código Pix copiado! Cole no app do seu banco.");
                }}
                data-testid="pix-copy-button"
              >
                <Copy className="h-4 w-4" /> Copiar Pix Copia e Cola
              </Button>
              {charge.ticket_url && (
                <a
                  href={charge.ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#99582A] underline"
                  data-testid="pix-ticket-link"
                >
                  Abrir instruções no Mercado Pago
                </a>
              )}
              <p className="flex items-center gap-2 text-sm text-stone-500" data-testid="pix-waiting-label">
                <Loader2 className="h-4 w-4 animate-spin" /> Aguardando confirmação do pagamento...
              </p>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-stone-900">Assinar o Beauté</DialogTitle>
              <DialogDescription>Pagamento via Pix pelo Mercado Pago — ativação na hora.</DialogDescription>
            </DialogHeader>
            {config && !config.enabled && (
              <p className="mb-4 rounded-2xl border border-dashed border-[#D4A373] bg-[#F8EBDD]/60 p-3 text-xs text-stone-600">
                O Pix ainda não está configurado neste ambiente. Adicione o Access Token do Mercado Pago para
                começar a receber.
              </p>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["monthly", "annual"] as const).map((key) => {
                  const isAnnual = key === "annual";
                  const cents = isAnnual ? config?.annual_cents ?? 59000 : config?.monthly_cents ?? 6900;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPlan(key)}
                      data-testid={`pix-plan-${key}`}
                      className={`rounded-2xl border p-4 text-left transition-transform duration-200 active:scale-[0.98] ${
                        plan === key
                          ? "border-[#99582A] bg-[#F5EFE6] ring-1 ring-[#99582A]"
                          : "border-[#E7E2D9] bg-white hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <p className="text-sm font-semibold text-stone-900">{isAnnual ? "Anual" : "Mensal"}</p>
                      <p className="font-serif text-2xl text-stone-900">{formatBRL(cents)}</p>
                      <p className="text-xs text-stone-500">{isAnnual ? "2 meses grátis" : "por mês"}</p>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pix-cpf">CPF ou CNPJ do pagador</Label>
                <Input
                  id="pix-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  data-testid="pix-cpf-input"
                />
                <p className="text-xs text-stone-500">Exigido pelo Mercado Pago para emitir a cobrança Pix.</p>
              </div>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || cpf.replace(/\D/g, "").length < 11}
                className="w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
                data-testid="pix-generate-button"
              >
                <QrCode className="h-4 w-4" />
                {create.isPending ? "Gerando Pix..." : `Gerar Pix de ${formatBRL(amountCents)}`}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Pagamento processado pelo Mercado Pago
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
