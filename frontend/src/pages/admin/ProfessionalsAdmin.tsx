import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import type { Professional } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_FORM = { name: "", specialty: "", bio: "", imageUrl: "", active: true };

export default function ProfessionalsAdmin() {
  const qc = useQueryClient();
  const prosQ = useQuery({ queryKey: ["admin", "professionals"], queryFn: () => apiGet<Professional[]>("/professionals") });
  const professionals = prosQ.data ?? [];

  const [editing, setEditing] = useState<Professional | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Professional | null>(null);

  const openForm = (pro: Professional | "new") => {
    setEditing(pro);
    setForm(
      pro === "new"
        ? EMPTY_FORM
        : { name: pro.name, specialty: pro.specialty, bio: pro.bio, imageUrl: pro.image_url, active: pro.active },
    );
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        bio: form.bio.trim(),
        image_url: form.imageUrl.trim(),
        active: form.active,
      };
      return editing === "new"
        ? apiPost<Professional>("/professionals", body)
        : apiPatch<Professional>(`/professionals/${(editing as Professional).id}`, body);
    },
    onSuccess: () => {
      toast.success(editing === "new" ? "Profissional adicionado!" : "Profissional atualizado!");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "professionals"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar o profissional")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/professionals/${id}`),
    onSuccess: () => {
      toast.success("Profissional excluído.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin", "professionals"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível excluir o profissional")),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900">Profissionais</h1>
          <p className="mt-1 text-sm text-stone-500">Quem atende — aparece na página pública e nas agendas.</p>
        </div>
        <Button
          onClick={() => openForm("new")}
          className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
          data-testid="professional-create-button"
        >
          <Plus className="h-4 w-4" /> Adicionar profissional
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {professionals.length === 0 && (
          <p className="col-span-full rounded-3xl border border-dashed border-[#E7E2D9] bg-[#FFFDFC] py-12 text-center text-sm text-stone-500" data-testid="professionals-empty">
            Nenhum profissional cadastrado ainda.
          </p>
        )}
        {professionals.map((p) => (
          <Card key={p.id} className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]" data-testid={`professional-card-${p.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-[#E7C8A0]" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EFE6] font-serif text-xl text-stone-900">
                    {p.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg text-stone-900">{p.name}</p>
                  <p className="truncate text-xs uppercase tracking-wide text-[#99582A]">{p.specialty}</p>
                  {!p.active && <Badge variant="secondary" className="mt-1 rounded-full">Inativo</Badge>}
                </div>
              </div>
              {p.bio && <p className="mt-3 line-clamp-3 text-sm text-stone-500">{p.bio}</p>}
              <div className="mt-4 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openForm(p)} data-testid={`professional-edit-${p.id}`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(p)} className="text-destructive hover:text-destructive" data-testid={`professional-delete-${p.id}`}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stone-900">
              {editing === "new" ? "Adicionar profissional" : "Editar profissional"}
            </DialogTitle>
            <DialogDescription>Clientes escolhem com quem querem atender na hora de agendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="professional-form-name">Nome</Label>
              <Input id="professional-form-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Giovana Sá" data-testid="professional-form-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professional-form-specialty">Especialidade</Label>
              <Input id="professional-form-specialty" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="Ex.: Nail Designer" data-testid="professional-form-specialty-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professional-form-image">URL da foto (opcional)</Label>
              <Input id="professional-form-image" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." data-testid="professional-form-image-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professional-form-bio">Mini bio</Label>
              <Textarea id="professional-form-bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Experiência, especialidades..." data-testid="professional-form-bio-input" />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <Checkbox checked={form.active} onCheckedChange={(c) => setForm((f) => ({ ...f, active: !!c }))} data-testid="professional-form-active-checkbox" />
              Ativo (aceita agendamentos)
            </label>
            <Button
              onClick={() => save.mutate()}
              disabled={form.name.trim().length < 2 || save.isPending}
              className="w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D]"
              data-testid="professional-form-save-button"
            >
              {save.isPending ? "Salvando..." : "Salvar profissional"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-[#E7E2D9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">Excluir profissional?</DialogTitle>
            <DialogDescription>“{deleting?.name}” deixa de receber agendamentos públicos.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} data-testid="professional-delete-cancel-button">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleting && remove.mutate(deleting.id)} data-testid="professional-delete-confirm-button">
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
