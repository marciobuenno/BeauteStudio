# Beauté — Sistema SaaS para Studios de Beleza

SaaS multi-studio em pt-BR: cada estúdio se cadastra (teste grátis de 14 dias), ganha uma
página pública de agendamento elegante (`/b/{slug}`) e um painel administrativo (`/admin`).

## Rotas
- `/` — landing da plataforma (hero, funcionalidades, planos R$ 69/mês ou R$ 590/ano, CTA)
- `/login`, `/register` — auth por cookie httpOnly (`beaute_session`), rotas `/api/auth/*`
- `/admin` — dashboard (métricas + agenda do dia + próximos), `/admin/appointments` (lista,
  filtros, criação manual, concluir/cancelar), `/admin/services` (CRUD), `/admin/professionals`
  (CRUD), `/admin/schedule` (horários por dia da semana), `/admin/settings` (dados, link
  público, assinatura)
- `/b/:slug` — página pública do studio: splash cinematográfico (ENTRAR → catálogo,
  CONHECER O STUDIO → modal), chips de categoria, abas Serviços/Profissionais, cards com
  preço/duração e modal de agendamento em 4 passos (profissional → data → horário livre →
  dados da cliente)

## Dados (Mongo, ids string uuid4)
- `studios` — nome, slug único, email único, senha (pbkdf2), plano (`trial`/`active`),
  `plan_expires_at`, tagline/about/address/phone
- `sessions` — token httpOnly, 30 dias
- `services` — nome, categoria, descrição, `price_cents`, `duration_min`, imagem, ativo
- `professionals` — nome, especialidade, bio, foto, ativo
- `business_hours` — 1 doc por dia da semana (0-6), open/close "HH:MM", `closed`
- `appointments` — snapshots (service_name, price, duração, professional_name), date
  "YYYY-MM-DD", time "HH:MM", dados da cliente, status `confirmed|cancelled|completed`

## Lógica de horários
- `business_hours.weekday` é Python-style (0=segunda … 6=domingo). O frontend converte na
  fronteira com `pyToJsWeekday()`/`weekdayLabel()` em `src/lib/format.ts` — nunca compare o
  índice cru com `Date.getDay()` (0=domingo)
- Slots livres = horário de funcionamento do dia − intervalos ocupados (confirmação),
  passo de 30 min, serviço precisa caber antes do fecho; dias passados e hoje no passado
  são excluídos (relógio do servidor, TZ `America/Sao_Paulo` via `APP_TZ`)
- "Qualquer disponível" → backend atribui o primeiro profissional livre
- Agendamento público valida contra 409 se o horário acabou de ocupar

## Deviations conhecidos (não são bugs)
- Assinatura é MOCKADA: botão "Ativar plano anual (demo)" em /admin/settings chama
  `POST /api/studio/plan` — sem gateway de pagamento (fase futura)
- Sem notificações (WhatsApp/e-mail) — confirmação é na tela, conforme combinado
- Seed inclui 2 profissionais (usuário adicionará mais 2 pelo painel)

## Seed / credenciais
`cd /app/backend && python seed.py` (idempotente) cria o studio demo:
- Studio: **Beauté Clinic Studio** — slug `beaute-studio-1` → `/b/beaute-studio-1`
- Login: `contato@beauteclinic.com.br` / `beaute123` (ver `memory/test_credentials.md`)
- 6 serviços (Unhas, Estética Facial, Cílios & Sobrancelhas), 2 profissionais
  (Giovana Sá, Juliana Carneiro), Seg–Sáb 09:00–19:00, domingo fechado,
  3 agendamentos de exemplo no dia seguinte
