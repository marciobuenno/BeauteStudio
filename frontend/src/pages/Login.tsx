import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { beginSession } from "@/lib/session";
import type { Me } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOUNGE_IMG =
  "https://images.unsplash.com/photo-1759262151080-e05ba1c6294f?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => apiPost<Me>("/auth/login", { email: email.trim(), password }),
    onSuccess: (me) => {
      beginSession();
      toast.success(`Bem-vinda de volta, ${me.owner_name.split(" ")[0]}!`);
      navigate("/admin");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "E-mail ou senha incorretos")),
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden lg:flex lg:flex-col lg:justify-end">
        <img src={LOUNGE_IMG} alt="Studio de beleza" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#1A1715]/60" />
        <div className="relative p-12 text-[#FAF7F2]">
          <p className="font-serif text-3xl">“Sua melhor versão, todos os dias.”</p>
          <p className="mt-3 text-sm text-stone-300">Painel Beauté — gestão para studios de beleza</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="font-serif text-3xl tracking-tight text-stone-900" data-testid="login-logo-link">
            Beauté<span className="text-[#D4A373]">✦</span>
          </Link>
          <h1 className="mt-8 font-serif text-3xl tracking-tight text-stone-900">Entrar no seu studio</h1>
          <p className="mt-2 text-sm text-stone-500">Gerencie agenda, serviços e profissionais em um só lugar.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@studio.com.br"
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="login-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={login.isPending}
              className="h-11 w-full rounded-full bg-[#99582A] text-white hover:bg-[#7C3E1D] active:scale-[0.98]"
              data-testid="login-submit-button"
            >
              {login.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-stone-500">
            Ainda não tem studio?{" "}
            <Link to="/register" data-testid="login-to-register-link" className="font-medium text-[#99582A] hover:underline">
              Criar meu studio agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
