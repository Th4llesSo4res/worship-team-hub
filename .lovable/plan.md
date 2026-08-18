# WorshipApp — MVP de gestão de equipe de louvor

Conexão Supabase verificada: o projeto externo está ligado (URL, chave publicável e project id presentes), com clientes gerados em `src/integrations/supabase/` e autenticação de servidor pronta. O banco ainda está vazio — nenhuma tabela criada.

## Etapa 1 — Banco de dados (migrations versionadas)

- Enums: `membership_role`, `membership_status`, `function_category`, `event_type`, `event_status`, `assignment_status`.
- Tabelas com UUID, FKs, únicos, índices e timestamps: `organizations`, `profiles`, `memberships`, `invitations`, `ministry_functions`, `member_functions`, `events`, `event_assignments`, `songs`, `event_songs`.
- Trigger de `updated_at` e trigger em `auth.users` para criar `profiles`.
- GRANTs explícitos por tabela (`authenticated`, `service_role`).

## Etapa 2 — Segurança (RLS)

- Funções `SECURITY DEFINER` sem recursão: `is_active_member(org)`, `has_org_role(org, roles[])`, `current_membership_id(org)`.
- Políticas por tabela garantindo: isolamento entre organizações; só membros `active` leem dados; só `leader` gerencia convites, aprovações, cargos e funções; `leader`+`minister` gerenciam eventos, escalas, músicas e repertório; músico só vê eventos não-rascunho; cada usuário edita só o próprio perfil; cada integrante altera só `response_status`/`response_note`/`responded_at` da própria atribuição (trigger reforça as colunas imutáveis); `pending`/`inactive` sem acesso a dados internos.
- RPCs seguras: `create_organization_with_leader` (atômica, cria org + membership leader ativo + 12 funções musicais iniciais), `create_invitation` (gera token, grava só o hash, expira em 7 dias), `accept_invitation` (valida hash, e-mail correspondente, expiração e uso, cria membership `pending`).

## Etapa 3 — Base do app

- Design system em `src/styles.css`: azul-marinho profundo, off-white e dourado discreto; tipografia moderna; tokens semânticos.
- Layout mobile-first com navegação inferior (Início, Agenda, Repertório, Perfil) e menu administrativo por cargo.
- Contexto de sessão + membership, guarda de rotas por autenticação/cargo/status, toasts, skeletons, estados vazios e diálogos de confirmação.
- PWA básica: manifest, ícones provisórios, meta tags. SPA fallback já garantido pelo roteador (sem 404 em refresh).

## Etapa 4 — Telas

Públicas: `/login`, `/cadastro?convite=TOKEN`, `/recuperar-senha`.
Fluxo inicial: `/criar-equipe`, `/aguardando-aprovacao`.
Protegidas: `/dashboard` (raiz), `/agenda`, `/repertorio`, `/eventos/novo`, `/eventos/:id`, `/eventos/:id/editar`, `/musicas`, `/equipe`, `/convites`, `/perfil`.

Dashboard: saudação, próxima escala com função, status e ações confirmar/recusar (recusa exige justificativa), resumo do repertório e próximas escalas. Para líder/ministro: resumo do próximo evento, contagem de confirmados/pendentes/recusados, nomes dos pendentes, alerta de funções não preenchidas e atalhos.

## Etapa 5 — Entrega

- Build + lint, revisão das políticas RLS com o linter do Supabase.
- `.env.example` e README (setup local, variáveis, publicação, como testar os três cargos).
- Relatório final: migrations, tabelas, funções, políticas, rotas e pendências reais.

## Detalhes técnicos

- Escritas sensíveis (criar organização, convites, aceite) via RPC `SECURITY DEFINER` chamada por server functions do TanStack Start; leituras via cliente Supabase com RLS do usuário. Sem `service_role` no frontend.
- Tipos do banco regenerados após as migrations e usados em todo o código.
- Nenhum dado de demonstração permanente — apenas as funções musicais iniciais na criação da organização.

## Fora do escopo

Chat, WhatsApp automático, push, presença em ensaio, substituição automática, relatórios avançados, APIs de música, upload de arquivos, pagamentos e app nativo.
