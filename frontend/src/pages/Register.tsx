import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { beginSession } from "@/lib/session";
import { maskPhone, slugifyPreview } from "@/lib/format";
import type { Me } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOUNGE_IMG =
  "https://images.unsplash.com/photo-1781513144825-aa1e284c5950?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Register() {
  const navigate = useNavigate();
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = useMutation({
    mutationFn: () =>
      apiPost<Me>("/auth/register", {
        studio_name: studioName.trim(),
        owner_name: ownerName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      }),
    onSuccess: (me) => {
      beginSession();
      toast.success(`Studio criado! Bem-vinda ao Beauté, ${me.owner_name.split(" ")[0]}.`);
      navigate("/admin");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível criar o studio. Revise os dados.")),
  });

  const slugPreview = slugifyPreview(studioName);

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden lg:flex lg:flex-col lg:justify-end">
        <img src={LOUNGE_IMG} alt="Studio de beleza" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#1A1715]/60" />
        <div className="relative p-12 text-[#FAF7F2]">
          <p className="font-serif text-3xl">Seu studio, com a elegância que ele merece.</p>
          <ul className="mt-6 space-y-2 text-sm text-stone-300">
            {[
              "14 dias de teste grátis — sem cartão",
              "Página pública de agendamento inclusa",
              "Agenda, serviços e profissionais ilimitados",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#D4A373]" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="font-serif text-3xl tracking-tight text-stone-900" data-testid="register-logo-link">
            Beauté<span className="text-[#D4A373]">✦</span>
          </Link>
          <h1 className="mt-8 font-serif text-3xl tracking-tight text-stone-900">Criar meu studio</h1>
          <p className="mt-2 text-sm text-stone-500">Em 2 minutos sua página de agendamento está no ar.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              register.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="register-studio-name">Nome do studio</Label>
              <Input
                id="register-studio-name"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Ex.: Beauté Clinic Studio"
                required
                data-testid="register-studio-name-input"
              />
              {studioName.trim().length >= 2 && (
                <p className="text-xs text-stone-500">
                  Sua página pública: <span className="font-medium text-[#99582A]">/b/{slugPreview}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-owner-name">Seu nome</Label>
              <Input
                id="register-owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ex.: Giovana Sá"
                required
                data-testid="register-owner-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-phone">WhatsApp do studio (opcional)</Label>
              <Input
                id="register-phone"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 91234-5678"
                inputMode="numeric"
                data-testid="register-phone-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-email">E-mail de acesso</Label>
              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@studio.com.br"
                required
                data-testid="register-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-password">Senha (mín. 6 caracteres)</Label>
              <Input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                data-testid="register-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={register.isPending}
              className="h-11 w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
              data-testid="register-submit-button"
            >
              {register.isPending ? "Criando studio..." : "Criar meu studio — teste grátis"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-stone-500">
            Já tem studio?{" "}
            <Link to="/login" data-testid="register-to-login-link" className="font-medium text-[#99582A] hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
