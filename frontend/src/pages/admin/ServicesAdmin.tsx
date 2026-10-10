import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatBRL } from "@/lib/format";
import type { Service } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_FORM = { name: "", category: "", description: "", priceReais: "", durationMin: "60", imageUrl: "", active: true };

export default function ServicesAdmin() {
  const qc = useQueryClient();
  const servicesQ = useQuery({ queryKey: ["admin", "services"], queryFn: () => apiGet<Service[]>("/services") });
  const services = servicesQ.data ?? [];
  const categories = Array.from(new Set(services.map((s) => s.category)));

  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const openForm = (service: Service | "new") => {
    setEditing(service);
    if (service === "new") {
      setForm(EMPTY_FORM);
    } else {
      setForm({
        name: service.name,
        category: service.category,
        description: service.description,
        priceReais: (service.price_cents / 100).toFixed(2),
        durationMin: String(service.duration_min),
        imageUrl: service.image_url,
        active: service.active,
      });
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const priceCents = Math.round(parseFloat(form.priceReais.replace(",", ".")) * 100);
      const body = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price_cents: priceCents,
        duration_min: parseInt(form.durationMin, 10),
        image_url: form.imageUrl.trim(),
        active: form.active,
      };
      return editing === "new"
        ? apiPost<Service>("/services", body)
        : apiPatch<Service>(`/services/${(editing as Service).id}`, body);
    },
    onSuccess: (_s, _v) => {
      toast.success(editing === "new" ? "Serviço criado!" : "Serviço atualizado!");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar o serviço. Confira os valores.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/services/${id}`),
    onSuccess: () => {
      toast.success("Serviço excluído.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível excluir o serviço")),
  });

  const priceValid = !Number.isNaN(parseFloat(form.priceReais.replace(",", ".")));
  const durationValid = parseInt(form.durationMin, 10) >= 5;
  const formValid = form.name.trim().length >= 2 && form.category.trim().length >= 2 && priceValid && durationValid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900">Serviços</h1>
          <p className="mt-1 text-sm text-stone-500">O catálogo que suas clientes veem na página pública.</p>
        </div>
        <Button
          onClick={() => openForm("new")}
          className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
          data-testid="service-create-button"
        >
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      <div className="rounded-3xl border border-[#E7E2D9] bg-[#FFFDFC]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-stone-500" data-testid="services-empty">
                  Nenhum serviço cadastrado ainda — crie o primeiro!
                </TableCell>
              </TableRow>
            )}
            {services.map((s) => (
              <TableRow key={s.id} data-testid={`service-row-${s.id}`}>
                <TableCell>
                  <p className="font-medium text-stone-900">{s.name}</p>
                  {s.description && <p className="max-w-xs truncate text-xs text-stone-500">{s.description}</p>}
                </TableCell>
                <TableCell><Badge variant="secondary" className="rounded-full">{s.category}</Badge></TableCell>
                <TableCell>{s.duration_min} min</TableCell>
                <TableCell className="font-medium">{formatBRL(s.price_cents)}</TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge className="rounded-full bg-[#DCFCE7] text-[#14532D] hover:bg-[#DCFCE7]">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${s.name}`} onClick={() => openForm(s)} data-testid={`service-edit-${s.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${s.name}`} onClick={() => setDeleting(s)} className="text-destructive hover:text-destructive" data-testid={`service-delete-${s.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stone-900">
              {editing === "new" ? "Novo serviço" : "Editar serviço"}
            </DialogTitle>
            <DialogDescription>Esse serviço aparece na página pública com foto, preço e botão Agendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="service-form-name">Nome</Label>
              <Input id="service-form-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Alongamento em Gel" data-testid="service-form-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-form-category">Categoria</Label>
              <Input id="service-form-category" list="category-options" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex.: Unhas" data-testid="service-form-category-input" />
              <datalist id="category-options">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="service-form-price">Preço (R$)</Label>
                <Input id="service-form-price" inputMode="decimal" value={form.priceReais} onChange={(e) => setForm((f) => ({ ...f, priceReais: e.target.value }))} placeholder="150,00" data-testid="service-form-price-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service-form-duration">Duração (min)</Label>
                <Input id="service-form-duration" inputMode="numeric" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))} data-testid="service-form-duration-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-form-image">URL da foto (opcional)</Label>
              <Input id="service-form-image" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." data-testid="service-form-image-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-form-description">Descrição</Label>
              <Textarea id="service-form-description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descreva o serviço para encantar suas clientes" data-testid="service-form-description-input" />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <Checkbox checked={form.active} onCheckedChange={(c) => setForm((f) => ({ ...f, active: !!c }))} data-testid="service-form-active-checkbox" />
              Serviço ativo (visível na página pública)
            </label>
            <Button
              onClick={() => save.mutate()}
              disabled={!formValid || save.isPending}
              className="w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]"
              data-testid="service-form-save-button"
            >
              {save.isPending ? "Salvando..." : "Salvar serviço"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">Excluir serviço?</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” sai do catálogo público. Agendamentos existentes são mantidos no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} data-testid="service-delete-cancel-button">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleting && remove.mutate(deleting.id)} data-testid="service-delete-confirm-button">
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
