# WorshipApp — MVP de gestão de equipe de louvor

Conexão Supabase verificada: o projeto externo está ligado (URL, chave publicável e project id presentes), com clientes gerados em `src/integrations/supabase/` e autenticação de servidor pronta. O banco ainda está vazio — nenhuma tabela criada.

## Etapa 1 — Banco de dados (migrations versionadas)

- Enums: `membership_role`, `membership_status`, `function_category`, `event_type`, `event_status`, `assignment_status`.
- Tabelas com UUID, FKs, únicos, índices e timestamps: `organizations`, `profiles`, `memberships`, `invitations`, `ministry_functions`, `member_functions`, `events`, `event_assignments`, `songs`, `event_songs`.
- `profiles.id` com FK para `auth.users(id) ON DELETE CASCADE`.
- Trigger de `updated_at` e trigger em `auth.users` para criar `profiles`. O trigger nunca bloqueia o cadastro: `full_name` usa fallback seguro (metadado → parte local do e-mail → "Novo integrante"), `INSERT ... ON CONFLICT (id) DO NOTHING` e função à prova de exceção. O cadastro completo será testado ponta a ponta.
- Uma membership por usuário no MVP: índice único parcial em `user_id` para status `pending`/`active`; violação retorna erro amigável ("você já pertence a uma equipe"). `organization_id` permanece em todas as tabelas para expansão futura.
- GRANTs de privilégio mínimo por tabela e por coluna quando cabível. Nenhum GRANT amplo para `anon`; `authenticated` recebe apenas os verbos que as políticas realmente permitem; `service_role` para uso server-side.

## Etapa 2 — Segurança (RLS e funções)

- Schema privado `app_private` (não exposto na Data API) para as funções auxiliares de RLS: `is_active_member(org)`, `has_org_role(org, roles[])`, `current_membership_id(org)` — sem recursão nas políticas.
- Toda função `SECURITY DEFINER` usa `SET search_path = ''`, referências totalmente qualificadas (`public.`, `auth.`, `app_private.`) e valida internamente `auth.uid()`, organização, cargo e e-mail confirmado. `REVOKE EXECUTE ... FROM PUBLIC, anon` em todas elas, com `GRANT EXECUTE` apenas às roles estritamente necessárias.
- Políticas por tabela garantindo: isolamento entre organizações; só membros `active` leem dados; só `leader` gerencia convites, aprovações, cargos e funções; `leader`+`minister` gerenciam eventos, escalas, músicas e repertório; músico só vê eventos não-rascunho; cada usuário edita só o próprio perfil; cada integrante altera só `response_status`/`response_note`/`responded_at` da própria atribuição (trigger reforça as colunas imutáveis `event_id`, `membership_id`, `function_id`, `assigned_by`); `pending`/`inactive` sem acesso a dados internos.
- Operações privilegiadas ficam em server functions do TanStack Start (equivalente às Edge Functions nesta stack, executando fora do navegador, com `service_role` nunca exposto): criação da organização, emissão de convite e aceite. Elas fazem a validação de identidade/cargo antes de qualquer escrita.
- Funções de banco expostas ficam restritas ao mínimo. `public.accept_invitation` permanece exposta a `authenticated` (justificativa: precisa executar de forma atômica sob a identidade do usuário recém-cadastrado e comparar o e-mail autenticado com o convite dentro da transação); ela exige usuário autenticado **com e-mail confirmado**, valida hash do token, expiração e uso, e cria membership `pending`. Demais RPCs sensíveis não recebem EXECUTE para `anon`.
- Convites: token gerado no servidor, armazenado apenas como hash, validade de 7 dias, tabela sem leitura anônima e sem log do token em claro.


## Etapa 3 — Base do app

- Design system em `src/styles.css`: azul-marinho profundo, off-white e dourado discreto; tipografia moderna; tokens semânticos.
- Layout mobile-first com navegação inferior (Início, Agenda, Repertório, Perfil) e menu administrativo por cargo.
- Contexto de sessão + membership, guarda de rotas por autenticação/cargo/status, toasts, skeletons, estados vazios e diálogos de confirmação.
- PWA básica: manifest, ícones provisórios, meta tags. SPA fallback já garantido pelo roteador (sem 404 em refresh).

## Etapa 4 — Cadastro, confirmação de e-mail e convites

- Confirmação de e-mail permanece habilitada.
- O token do convite sobrevive à confirmação: o cadastro usa `emailRedirectTo` apontando para `/cadastro?convite=TOKEN` (mesma origem), sem gravar o token em logs ou telemetria.
- Após a confirmação, com usuário autenticado e e-mail confirmado, o aceite compara o e-mail autenticado com o do convite e cria a membership `pending`.
- Fluxo para quem já tem conta: ao abrir o link, se houver sessão, o aceite ocorre direto; se não houver, o usuário faz login e volta ao mesmo link, preservando o token.

## Etapa 5 — Telas

Públicas: `/login`, `/cadastro?convite=TOKEN`, `/recuperar-senha`.
Fluxo inicial: `/criar-equipe`, `/aguardando-aprovacao`.
Protegidas: `/dashboard` (raiz), `/agenda`, `/repertorio`, `/eventos/novo`, `/eventos/:id`, `/eventos/:id/editar`, `/musicas`, `/equipe`, `/convites`, `/perfil`.

Dashboard: saudação, próxima escala com função, status e ações confirmar/recusar (recusa exige justificativa), resumo do repertório e próximas escalas. Para líder/ministro: resumo do próximo evento, contagem de confirmados/pendentes/recusados, nomes dos pendentes, alerta de funções não preenchidas e atalhos.

## Etapa 6 — Testes negativos de segurança

Cada cenário deve falhar (erro de permissão) e será verificado:

- músico tentando editar evento e repertório;
- ministro tentando alterar cargos ou aprovar integrantes;
- usuário alterando a escala de outra pessoa;
- usuário de uma organização acessando dados de outra;
- alteração direta das colunas imutáveis de `event_assignments`;
- convite expirado, convite já utilizado e convite aceito com e-mail diferente.

## Etapa 7 — Entrega

- Build + lint, revisão das políticas RLS com o linter do Supabase.
- `.env.example` e README: setup local, variáveis, publicação, como testar os três cargos e configuração de **Site URL e Redirect URLs** no Supabase Auth para `http://localhost:8080`, o preview do Lovable e a futura URL de produção/Vercel.
- Relatório final: migrations, tabelas, funções, políticas, rotas e pendências reais.


## Detalhes técnicos

- Escritas sensíveis (criar organização, convites, aceite) via RPC `SECURITY DEFINER` chamada por server functions do TanStack Start; leituras via cliente Supabase com RLS do usuário. Sem `service_role` no frontend.
- Tipos do banco regenerados após as migrations e usados em todo o código.
- Nenhum dado de demonstração permanente — apenas as funções musicais iniciais na criação da organização.

## Fora do escopo

Chat, WhatsApp automático, push, presença em ensaio, substituição automática, relatórios avançados, APIs de música, upload de arquivos, pagamentos e app nativo.
