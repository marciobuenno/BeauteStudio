import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { weekdayLabel } from "@/lib/format";
import type { BusinessHour } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ScheduleAdmin() {
  const qc = useQueryClient();
  const hoursQ = useQuery({ queryKey: ["admin", "hours"], queryFn: () => apiGet<BusinessHour[]>("/studio/hours") });
  const [rows, setRows] = useState<BusinessHour[] | null>(null);

  useEffect(() => {
    if (hoursQ.data) {
      const byWeekday = new Map(hoursQ.data.map((h) => [h.weekday, h]));
      setRows(
        Array.from({ length: 7 }, (_, wd) =>
          byWeekday.get(wd) ?? {
            id: `new-${wd}`,
            studio_id: "",
            weekday: wd,
            open_time: "09:00",
            close_time: "19:00",
            closed: wd === 6,
          },
        ),
      );
    }
  }, [hoursQ.data]);

  const save = useMutation({
    mutationFn: () =>
      apiPut<BusinessHour[]>("/studio/hours", {
        entries: (rows ?? []).map((r) => ({
          weekday: r.weekday,
          open_time: r.open_time,
          close_time: r.close_time,
          closed: r.closed,
        })),
      }),
    onSuccess: () => {
      toast.success("Horários de funcionamento salvos!");
      qc.invalidateQueries({ queryKey: ["admin", "hours"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar os horários")),
  });

  const update = (weekday: number, patch: Partial<BusinessHour>) => {
    setRows((prev) => prev?.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)) ?? prev);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">Horários de funcionamento</h1>
        <p className="mt-1 text-sm text-stone-500">
          Os horários livres da página pública são calculados a partir daqui — os horários já ocupados são descontados
          automaticamente.
        </p>
      </div>

      <Card className="rounded-3xl border-[#E7E2D9] bg-[#FFFDFC]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">Semana padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows === null &&
            Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#F1EAE0]" />)}
          {rows?.map((row) => (
            <div
              key={row.weekday}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E7E2D9] p-4"
              data-testid={`schedule-row-${row.weekday}`}
            >
              <p className="w-28 font-medium text-stone-900">{weekdayLabel(row.weekday)}</p>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <Checkbox
                  checked={!row.closed}
                  onCheckedChange={(c) => update(row.weekday, { closed: !c })}
                  data-testid={`schedule-open-checkbox-${row.weekday}`}
                />
                Aberto
              </label>
              <div className="flex items-center gap-2">
                <div className="space-y-0.5">
                  <Label className="text-xs text-stone-500">Abre</Label>
                  <Input
                    type="time"
                    step={1800}
                    value={row.open_time}
                    disabled={row.closed}
                    onChange={(e) => update(row.weekday, { open_time: e.target.value })}
                    className="w-32"
                    data-testid={`schedule-open-input-${row.weekday}`}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-stone-500">Fecha</Label>
                  <Input
                    type="time"
                    step={1800}
                    value={row.close_time}
                    disabled={row.closed}
                    onChange={(e) => update(row.weekday, { close_time: e.target.value })}
                    className="w-32"
                    data-testid={`schedule-close-input-${row.weekday}`}
                  />
                </div>
              </div>
              {row.closed && <span className="text-sm text-stone-400">Fechado neste dia</span>}
            </div>
          ))}
          <Button
            onClick={() => save.mutate()}
            disabled={rows === null || save.isPending}
            className="rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
            data-testid="schedule-save-button"
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Salvando..." : "Salvar horários"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
