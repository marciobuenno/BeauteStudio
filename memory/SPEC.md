# Beauté — Sistema SaaS para Studios de Beleza

SaaS multi-studio em pt-BR: cada estúdio se cadastra (teste grátis de 14 dias), ganha uma
página pública de agendamento elegante (`/b/{slug}`) e um painel administrativo (`/admin`).

## Rotas
- `/` — landing da plataforma (hero, funcionalidades, planos R$ 69/mês ou R$ 590/ano, CTA)
- `/login`, `/register` — auth por cookie httpOnly (`beaute_session`), rotas `/api/auth/*`
- `/admin` — dashboard (métricas + agenda do dia + próximos)
- `/admin/agenda` — **agenda visual da semana** (7 colunas, filtro por profissional, navegação
  entre semanas, atalho de WhatsApp em cada atendimento) via `GET /api/appointments/week`
- `/admin/appointments` — lista, filtros, criação manual, concluir/cancelar, botão WhatsApp
- `/admin/reminders` — **avisos no WhatsApp**: lembretes de amanhã + confirmações de hoje, com
  mensagem pronta via link `wa.me` e marcação de "Enviado" (`POST /api/appointments/{id}/reminder`)
- `/admin/reports` — **relatório financeiro**: KPIs (faturamento, atendimentos, ticket médio,
  clientes, cancelamentos), evolução mensal (linha) e faturamento por serviço/profissional
  (barras, recharts), com filtro de período — `GET /api/reports/revenue?start&end`
- `/admin/services`, `/admin/professionals` (CRUD), `/admin/schedule` (horários por dia),
  `/admin/settings` (dados, link público, **assinatura via Pix**)
- `/b/:slug` — página pública do studio: splash cinematográfico (ENTRAR → catálogo,
  CONHECER O STUDIO → modal), chips de categoria, abas Serviços/Profissionais, cards com
  preço/duração e modal de agendamento em 4 passos (profissional → data → horário livre →
  dados da cliente)

## Cobrança (Mercado Pago Pix — Checkout Transparente)
- `GET /api/billing/config` diz se o Pix está habilitado (presença de `MP_ACCESS_TOKEN`)
- `POST /api/billing/pix` cria a cobrança (`POST /v1/payments`, `payment_method_id=pix`) e
  devolve QR Code + Copia-e-Cola. **O preço vem do catálogo do servidor** (`PLANS` em
  `routers/billing.py`: mensal R$ 69/1 mês, anual R$ 590/12 meses) — nunca do cliente
- `GET /api/billing/pix/{id}` consulta o status no Mercado Pago (polling do frontend a cada 5s)
- `POST /api/billing/webhook/mercadopago` — endpoint público; valida `x-signature` (HMAC-SHA256
  sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) quando `MP_WEBHOOK_SECRET` existe
- Ativação é **idempotente** (guard `activated: False`) e só ocorre com status `approved` +
  conferência de valor e `external_reference`; renovação estende a validade atual
- Env em `backend/.env`: `MP_ACCESS_TOKEN` (obrigatório), `MP_WEBHOOK_SECRET` e
  `MP_WEBHOOK_URL` (opcionais, para o webhook)

## WhatsApp
Links `wa.me` com mensagem pré-escrita (`src/lib/whatsapp.ts`) — sem provedor, sem custo;
nada é enviado sem o toque do studio. O número recebe o prefixo 55 automaticamente.

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
