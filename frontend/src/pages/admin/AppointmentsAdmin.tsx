import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { useMe } from "@/lib/queries";
import { formatBRL, formatDayLabel, maskPhone, STATUS_LABEL } from "@/lib/format";
import { confirmationMessage, waLink } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus, Professional, Service } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const SCOPES = [
  { value: "today", label: "Hoje" },
  { value: "upcoming", label: "Próximos" },
  { value: "all", label: "Todos" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "confirmed", label: "Confirmados" },
  { value: "completed", label: "Concluídos" },
  { value: "cancelled", label: "Cancelados" },
] as const;

const STATUS_LABEL_MAP = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

function statusBadge(status: string) {
  if (status === "confirmed") return <Badge className="rounded-full bg-[#F8EBDD] text-[#7C3E1D] hover:bg-[#F8EBDD]">{STATUS_LABEL[status]}</Badge>;
  if (status === "completed") return <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="destructive" className="rounded-full">{STATUS_LABEL[status]}</Badge>;
}

export default function AppointmentsAdmin() {
  const qc = useQueryClient();
  const me = useMe();
  const [scope, setScope] = useState<string>("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ serviceId: "", professionalId: "", date: "", time: "", customerName: "", customerPhone: "", notes: "" });

  const servicesQ = useQuery({ queryKey: ["admin", "services"], queryFn: () => apiGet<Service[]>("/services") });
  const professionalsQ = useQuery({ queryKey: ["admin", "professionals"], queryFn: () => apiGet<Professional[]>("/professionals") });

  const listQ = useQuery({
    queryKey: ["admin", "appointments", scope, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (scope !== "all") params.set("scope", scope);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      return apiGet<Appointment[]>(`/appointments${qs ? `?${qs}` : ""}`);
    },
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<Appointment>("/appointments", {
        service_id: form.serviceId,
        professional_id: form.professionalId || null,
        date: form.date,
        time: form.time,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        notes: form.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Agendamento criado!");
      setCreateOpen(false);
      setForm({ serviceId: "", professionalId: "", date: "", time: "", customerName: "", customerPhone: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível criar o agendamento")),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      apiPatch<Appointment>(`/appointments/${id}`, { status }),
    onSuccess: (_appt, vars) => {
      toast.success(vars.status === "completed" ? "Atendimento concluído!" : "Agendamento cancelado.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível atualizar o agendamento")),
  });

  const services = servicesQ.data ?? [];
  const professionals = professionalsQ.data ?? [];
  const rows = listQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900">Agendamentos</h1>
          <p className="mt-1 text-sm text-stone-500">Confirme, conclua e organize os atendimentos.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
          data-testid="appointment-create-button"
        >
          <Plus className="h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={setScope}>
          <TabsList data-testid="appointments-scope-tabs">
            {SCOPES.map((s) => (
              <TabsTrigger key={s.value} value={s.value} data-testid={`appointments-scope-${s.value}`}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="appointments-status-filter">
            <SelectValue>{(v) => STATUS_LABEL_MAP[v as string] ?? "Status"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-3xl border border-[#E7E2D9] bg-[#FFFDFC]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-stone-500" data-testid="appointments-empty">
                  Nenhum agendamento encontrado neste filtro.
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => (
              <TableRow key={a.id} data-testid={`appointment-row-${a.id}`}>
                <TableCell className="whitespace-nowrap">{formatDayLabel(a.date)}</TableCell>
                <TableCell className="font-medium">{a.time}</TableCell>
                <TableCell>
                  <p className="font-medium text-stone-900">{a.customer_name}</p>
                  <p className="text-xs text-stone-500">{a.customer_phone}</p>
                </TableCell>
                <TableCell>{a.service_name}</TableCell>
                <TableCell>{a.professional_name ?? "A definir"}</TableCell>
                <TableCell>{formatBRL(a.price_cents)}</TableCell>
                <TableCell>{statusBadge(a.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <a
                      href={waLink(a.customer_phone, confirmationMessage(a, me.data?.studio_name ?? "nosso studio"))}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Avisar ${a.customer_name} no WhatsApp`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-green-700 transition-colors duration-150 hover:bg-green-100"
                      data-testid={`appointment-whatsapp-${a.id}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    {a.status === "confirmed" ? (
                      <>
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
                      </>
                    ) : (
                      <span className="self-center text-xs text-stone-400">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Manual booking dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stone-900">Novo agendamento</DialogTitle>
            <DialogDescription>Agende presencialmente, por telefone ou WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select value={form.serviceId} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v }))}>
                <SelectTrigger data-testid="appointment-form-service-select">
                  <SelectValue>{(v) => services.find((s) => s.id === v)?.name ?? "Escolha o serviço"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={form.professionalId} onValueChange={(v) => setForm((f) => ({ ...f, professionalId: v }))}>
                <SelectTrigger data-testid="appointment-form-professional-select">
                  <SelectValue>
                    {(v) => professionals.find((p) => p.id === v)?.name ?? "A definir depois"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">A definir depois</SelectItem>
                  {professionals.filter((p) => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="appointment-form-date">Data</Label>
                <Input
                  id="appointment-form-date"
                  type="date"
                  min={me.data?.today}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  data-testid="appointment-form-date-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appointment-form-time">Hora</Label>
                <Input
                  id="appointment-form-time"
                  type="time"
                  step={1800}
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  data-testid="appointment-form-time-input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appointment-form-customer">Nome da cliente</Label>
              <Input
                id="appointment-form-customer"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="Ex.: Marina Alves"
                data-testid="appointment-form-customer-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appointment-form-phone">WhatsApp</Label>
              <Input
                id="appointment-form-phone"
                value={form.customerPhone}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: maskPhone(e.target.value) }))}
                placeholder="(11) 91234-5678"
                inputMode="numeric"
                data-testid="appointment-form-phone-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appointment-form-notes">Observações</Label>
              <Textarea
                id="appointment-form-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Preferências, detalhes do pedido..."
                data-testid="appointment-form-notes-input"
              />
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={
                create.isPending ||
                !form.serviceId ||
                !form.date ||
                !form.time ||
                form.customerName.trim().length < 2 ||
                form.customerPhone.replace(/\D/g, "").length < 10
              }
              className="w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]"
              data-testid="appointment-form-save-button"
            >
              {create.isPending ? "Salvando..." : "Criar agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
