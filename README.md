# Worship Team Hub

Quero criar um aplicativo web chamado WorshipApp para organizar uma equipe de louvor. Construa um MVP funcional, mobile-first, em português do Brasil, usando o projeto Supabase externo que está conectado a este projeto.

Antes de alterar o código, analise toda a especificação abaixo, apresente um plano curto de implementação dividido em etapas e verifique se o Supabase está corretamente conectado. Depois da confirmação do plano, implemente o MVP. Não use Firebase e não crie um backend paralelo. O Supabase conectado será a única fonte de autenticação, banco e funções de backend.

Objetivo

O sistema deve permitir que Líderes e Ministros criem cultos/eventos, montem escalas e repertórios. Músicos devem visualizar suas escalas e confirmar ou recusar participação.

Stack e qualidade

Use TypeScript, componentes reutilizáveis e Tailwind.

Utilize a stack padrão atual do Lovable.

Use Supabase Auth com e-mail e senha.

Crie migrations versionadas para todo o banco.

Gere e use os tipos TypeScript do banco.

Habilite RLS em todas as tabelas públicas.

Nunca use a chave service_role no frontend.

Não confie em verificações de cargo apenas no frontend.

Regras de autorização devem ser aplicadas no banco e, quando necessário, em Edge Functions/RPCs.

Não deixe dados de demonstração permanentes. Faça seed apenas das funções musicais iniciais ao criar uma organização.

Crie .env.example, README com instruções locais e tratamento claro de erros.

Garanta que atualizar uma rota interna no navegador não provoque erro 404.

Prepare o projeto como PWA básica, com manifest, nome, ícones provisórios e configuração instalável.

Modelo de autorização

Existem três cargos:

leader: acesso administrativo completo na própria organização.

minister: cria e edita eventos, escalas, músicas e repertórios, mas não gerencia convites, aprovação ou cargos.

musician: visualiza eventos publicados, repertórios e integrantes da própria organização; altera somente a resposta das próprias escalas e o próprio perfil.

Cargo de autorização é diferente de função musical. Uma pessoa pode ser minister e também ter as funções Violão e Voz principal.

Estrutura multi-organização

Mesmo que o MVP comece com uma equipe, modele todas as informações com organization_id. Um usuário só pode acessar dados das organizações em que possui membership active. Não permita vazamento de dados entre organizações.

Tabelas

Crie as tabelas abaixo com UUIDs, relacionamentos, restrições, índices, created_at e updated_at quando aplicável:

organizations: name, slug, logo_url, created_by.

profiles: id igual a auth.users.id, full_name, phone, avatar_url.

memberships: organization_id, user_id, role, status, approved_by, approved_at. Único por organização e usuário.

invitations: organization_id, email, role, token_hash, expires_at, used_at, created_by.

ministry_functions: organization_id, name, category, is_active.

member_functions: membership_id, function_id, is_primary. Único por membership e função.

events: organization_id, title, event_type, status, starts_at, ends_at, location, notes, created_by.

event_assignments: event_id, membership_id, function_id, response_status, response_note, responded_at, assigned_by. Único por evento, integrante e função.

songs: organization_id, title, artist, default_key, reference_url, notes, is_active, created_by.

event_songs: event_id, song_id, position, selected_key, reference_url_override, notes. Posição e música não podem se repetir no mesmo evento.

Use os enums:

membership_role: leader, minister, musician

membership_status: pending, active, inactive

function_category: vocal, instrument, technical, other

event_type: service, rehearsal, special

event_status: draft, published, cancelled, completed

assignment_status: pending, confirmed, declined

Fluxo do primeiro Líder

Permita que o primeiro usuário crie uma conta e uma organização, tornando-se leader ativo. Faça essa operação de maneira atômica e segura no backend. Depois que a organização for criada, não permita que novos usuários entrem nela sem convite.

Ao criar a organização, cadastre estas funções musicais iniciais:

Ministro/Voz principal

Backing vocal

Violão

Guitarra

Teclado

Baixo

Bateria

Percussão

Trompete

Saxofone

Técnico de som

Projeção/Multimídia

Fluxo de convite

O Líder informa o e-mail e o cargo. Gere um link único de convite com validade de sete dias, para o Líder copiar e enviar pelo WhatsApp.

Armazene somente o hash do token.

Não permita leitura anônima da tabela invitations.

Valide o convite em Edge Function ou RPC segura.

O e-mail cadastrado deve corresponder ao convite.

Convite expirado ou utilizado não pode ser reutilizado.

Depois do cadastro, crie membership com status pending.

Apenas o Líder pode aprovar, alterar cargo ou inativar o integrante.

O convidado não pode escolher ou elevar o próprio cargo.

Eventos e escalas

Líder e Ministro podem:

criar evento como rascunho;

informar título, tipo, data/hora, local e observações;

adicionar integrantes ativos e suas funções;

publicar, editar, concluir ou cancelar o evento;

ver respostas pendentes, confirmadas e recusadas.

Músicos visualizam somente eventos publicados, cancelados ou concluídos da organização. Ao serem escalados, a resposta começa como pending.

Cada integrante pode alterar somente response_status, response_note e responded_at da própria atribuição. Recusa exige uma justificativa. Não permita que o integrante altere evento, pessoa, função ou responsável pela escala usando requisição direta.

Músicas e repertório

Líder e Ministro podem cadastrar músicas com título, artista, tom padrão, URL e observações. Eles podem montar o repertório de cada evento, definir a ordem, o tom utilizado, uma URL específica e observações.

O tom definido no evento não deve alterar o tom padrão da música. Músicos somente visualizam o catálogo e os repertórios permitidos.

Páginas

Crie:

/login

/cadastro?convite=TOKEN

/recuperar-senha

/criar-equipe

/aguardando-aprovacao

/dashboard

/agenda

/repertorio

/eventos/:id

/eventos/novo

/eventos/:id/editar

/musicas

/equipe

/convites

/perfil

Proteja as rotas conforme autenticação, membership e cargo.

Dashboard

Para todos os usuários ativos, mostre:

saudação;

próxima escala;

função na escala;

status da resposta;

ações de confirmar ou recusar quando pendente;

resumo do repertório;

próximas escalas.

Para Líder e Ministro, acrescente:

resumo do próximo evento;

quantidade de confirmados, pendentes e recusados;

nomes dos pendentes;

alerta de funções não preenchidas;

atalhos para criar evento e gerenciar escala.

Interface

Todo o texto deve estar em português do Brasil.

Use layout mobile-first, funcionando bem a partir de 360 px.

Crie navegação inferior no celular: Início, Agenda, Repertório e Perfil.

Coloque recursos administrativos em menu adicional conforme o cargo.

Visual moderno, limpo e reverente.

Paleta: azul-marinho profundo, branco/off-white e dourado discreto.

Não use clichês visuais religiosos em excesso.

Use estados vazios, skeletons, validação de formulários, toasts e diálogos de confirmação.

Não mostre botões sem permissão, mas mantenha toda a segurança no backend.

Regras de RLS

Implemente e teste políticas que garantam:

acesso apenas a organizações com membership active;

isolamento total entre organizações;

somente Líder gerencia convites, aprovação, status, cargos e funções dos integrantes;

Líder e Ministro gerenciam eventos, escalas, músicas e repertórios;

Músico não altera eventos, escala de terceiros, músicas ou repertórios;

usuário atualiza apenas o próprio perfil;

integrante atualiza apenas a resposta da própria escala;

Músico não visualiza rascunhos;

usuário pending vê somente a tela de espera;

usuário inactive não acessa dados internos.

Crie funções auxiliares seguras para verificar organização e cargo sem causar recursão nas políticas. Adicione índices nas colunas usadas pelas políticas e consultas.

Fora do escopo

Não implemente agora chat, WhatsApp automático, push notification, presença em ensaio, substituição automática, relatórios avançados, APIs de música, upload de arquivos, pagamentos ou aplicativo nativo.

Entrega

Ao terminar:

Execute os testes disponíveis e o build.

Faça uma revisão de segurança das políticas RLS.

Informe quais migrations, tabelas, funções e políticas foram criadas.

Liste as rotas implementadas.

Explique como testar manualmente os três cargos sem expor credenciais.

Atualize o README com configuração local, variáveis de ambiente e processo de publicação.

Informe claramente qualquer item que não tenha sido concluído; não simule funcionalidades inexistentes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17987db4-fa60-4350-b2a3-b17753cca418).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
