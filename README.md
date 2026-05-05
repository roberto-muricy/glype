# PSN Review

Hub de reviews de jogos do PlayStation. Aplicativo mobile (iOS/Android/web)
construído com **React Native + Expo** e **Supabase**.

> **Status:** Fase 1 — fundação técnica concluída. Sem UI polida e sem
> features ainda. Veja [O que está pronto](#o-que-está-pronto-fase-1) e
> [O que vem depois](#o-que-vem-depois-fases-2-e-3).

---

## Stack

- [Expo](https://expo.dev) SDK 54 + [Expo Router](https://docs.expo.dev/router/introduction)
  (file-based routing)
- React Native 0.81 + React 19
- TypeScript estrito (`"strict": true`)
- [Supabase](https://supabase.com) — PostgreSQL + Auth + RLS
- [NativeWind v4](https://www.nativewind.dev) — Tailwind para React Native
- [Zustand](https://zustand-demo.pmnd.rs) — estado global
- [TanStack Query](https://tanstack.com/query) — cache e fetching
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) —
  persistência segura da sessão (Keychain/Keystore)

---

## Como rodar do zero

### 1. Pré-requisitos

- Node 20+
- npm
- Conta no [Supabase](https://supabase.com)
- (opcional) Xcode para simulador iOS, Android Studio para emulador

### 2. Instalar dependências

```bash
git clone <este-repo>
cd psn-review
npm install --legacy-peer-deps
```

> O flag `--legacy-peer-deps` é necessário porque algumas peer-deps de
> React 19 ainda não foram atualizadas pelos pacotes nativos.

### 3. Configurar o Supabase

#### 3.1. Criar projeto

1. Em https://supabase.com/dashboard crie um novo projeto.
2. Anote a **Project URL** (Project Settings → General) e a
   **anon / publishable key** (Project Settings → API Keys → Publishable
   key, ou Legacy → anon).

#### 3.2. Aplicar as migrations

As migrations ficam em `supabase/migrations/` numeradas:

- `0001_initial_schema.sql` — tabelas + índices
- `0002_rls_policies.sql` — Row Level Security
- `0003_triggers.sql` — `handle_new_user` + `update_updated_at`

**Opção A — Dashboard (mais simples):**

1. SQL Editor → New query
2. Cole o conteúdo de `0001_initial_schema.sql` e clique em Run
3. Repita para `0002_rls_policies.sql` e `0003_triggers.sql`
4. No Table Editor, confirme as 7 tabelas criadas

**Opção B — Supabase CLI:**

```bash
npx supabase init                   # uma vez por máquina
npx supabase link --project-ref <SEU_PROJECT_ID>
npx supabase db push                # roda todas as migrations em ordem
```

#### 3.3. Desabilitar confirmação de email (apenas dev)

Em Authentication → Sign In / Providers → Email, desligue "Confirm email"
para testar signups sem precisar verificar inbox. Para reativar usuários
pendentes:

```sql
update auth.users set email_confirmed_at = now()
where email_confirmed_at is null;
```

### 4. Configurar variáveis de ambiente

Crie `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Preencha com os valores do seu projeto Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # ou eyJ... (legacy)
```

> **Importante:** o Expo só expõe ao bundle variáveis com prefixo
> `EXPO_PUBLIC_*`. Após editar `.env`, **mate o Metro com Ctrl+C e suba
> de novo** — ele lê o arquivo apenas no boot.

### 5. Rodar o app

```bash
npm start         # menu interativo (web, iOS, Android)
# ou
npm run web       # já abre no navegador
npm run ios       # simulador iOS
npm run android   # emulador Android
```

Se aparecer cache estranho (URL antiga, módulo faltando):

```bash
npx expo start --web --clear
```

---

## Variáveis de ambiente

| Variável | Onde conseguir | Obrigatória |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → General → Project URL | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → Publishable | ✅ |

⚠️ Nunca coloque a `service_role` / secret key no `.env` do app — ela
bypassa RLS e seria exposta no bundle.

---

## Estrutura de pastas

```
app/                          # Rotas (Expo Router file-based)
  _layout.tsx                 # root: AuthGate + redirects
  (auth)/
    _layout.tsx
    login.tsx                 # tela funcional, sem styling
    signup.tsx                # tela funcional, sem styling
  (tabs)/
    _layout.tsx               # 4 tabs: Home, Busca, Biblioteca, Perfil
    index.tsx                 # Home — placeholder
    search.tsx                # Busca — placeholder
    library.tsx               # Biblioteca — placeholder
    profile.tsx               # Perfil + botão Sair (funcional)

src/
  lib/
    supabase.ts               # cliente Supabase tipado, storage
                              # cross-platform (SecureStore/localStorage)
    queryClient.ts            # placeholder TanStack Query (Fase 2)
  stores/
    auth.ts                   # Zustand: session, user, profile, isLoading
  services/
    auth.service.ts           # signUp / signIn / signOut / getSession
  hooks/
    useAuth.ts                # useAuthBootstrap + useAuth
  types/
    database.types.ts         # placeholder; gerar com supabase CLI
    models.ts                 # interfaces de domínio (Profile, ...)
  components/
    ui/                       # vazio — Fase 2
    domain/                   # vazio — Fase 2
  theme/
    tokens.ts                 # cores principais (placeholder)

supabase/
  migrations/
    0001_initial_schema.sql   # tabelas + índices
    0002_rls_policies.sql     # RLS + 17 policies
    0003_triggers.sql         # handle_new_user + update_updated_at

app.config.ts                 # config do Expo + lê EXPO_PUBLIC_* para `extra`
tailwind.config.js            # NativeWind preset + tema dark base
global.css                    # @tailwind base/components/utilities
metro.config.js               # withNativeWind
babel.config.js               # nativewind/babel
```

### Convenção de pastas

- `app/` — apenas rotas. Toda lógica fica em `src/`.
- `src/lib/` — singletons de infra (cliente Supabase, query client).
- `src/services/` — funções puras que falam com APIs externas.
- `src/stores/` — estado global Zustand (memória).
- `src/hooks/` — hooks que combinam services + stores + side effects.
- `src/types/` — tipos: `database.types.ts` (gerado), `models.ts` (manual).
- `src/components/` — `ui/` para primitivos visuais reutilizáveis,
  `domain/` para componentes específicos do produto.
- `src/theme/` — tokens de design (cores, spacing, etc).

---

## Banco de dados

### Tabelas

- **`profiles`** — 1:1 com `auth.users`, criada via trigger no signup
- **`games`** — cache de jogos da API RAWG/IGDB (Fase 3)
- **`reviews`** — score 0-10, body ≥ 50 chars, único por (user, game)
- **`external_reviews`** — Metacritic, OpenCritic, etc.
- **`follows`** — sistema de follows (PK composto, sem auto-follow)
- **`review_likes`** — likes em reviews (PK composto)
- **`user_games`** — biblioteca: playing/played/wishlist/dropped

### RLS

Todas as tabelas têm RLS habilitada. Resumo:

| Tabela | Leitura | Escrita |
|---|---|---|
| `profiles` | pública | dono (`auth.uid() = id`) |
| `games` | pública | só `service_role` |
| `reviews` | público se `is_public=true` ou autor | autor |
| `external_reviews` | pública | só `service_role` |
| `follows` | pública | follower autenticado |
| `review_likes` | pública | dono |
| `user_games` | pública | dono |

### Triggers

- **`handle_new_user`** — cria automaticamente uma linha em `profiles`
  quando um usuário é inserido em `auth.users`. Lê `username` de
  `raw_user_meta_data` (com fallback baseado no email).
- **`update_updated_at`** — mantém `updated_at = now()` em UPDATEs de
  `profiles`, `games` e `reviews`.

---

## O que está pronto (Fase 1)

- [x] Projeto Expo + Expo Router configurado
- [x] TypeScript estrito sem `any` implícito
- [x] NativeWind v4 com tema dark base placeholder
- [x] Cliente Supabase tipado com persistência segura
  (SecureStore em mobile / localStorage em web)
- [x] Schema completo (7 tabelas + 8 índices)
- [x] RLS habilitada com 17 policies
- [x] Trigger `handle_new_user` cria profile automaticamente no signup
- [x] Trigger `update_updated_at` em profiles/games/reviews
- [x] Auth funcional: signUp, signIn, signOut com email/senha
- [x] Hook `useAuth` expondo `{ user, profile, session, isLoading,
      signIn, signUp, signOut }`
- [x] Persistência de sessão entre execuções
- [x] Navegação condicional (sem sessão → login; com sessão → tabs)
- [x] 4 tabs (Home, Busca, Biblioteca, Perfil) — placeholders sem styling

## O que vem depois (Fases 2 e 3)

### Fase 2 — Features

- Onboarding (seleção de gêneros favoritos)
- Integração com RAWG/IGDB para catálogo de jogos
- Busca de jogos e usuários
- Página de detalhes do jogo
- Sistema de reviews (criar, listar, curtir)
- Sistema de follows + perfis públicos
- Feed da home com atividade dos seguidos
- Biblioteca pessoal
- Motor de recomendações
- Notificações

### Fase 3 — Polish

- UI completa baseada nos tokens em `src/theme/tokens.ts`
- Componentes reutilizáveis em `src/components/ui` e `domain`
- Animações e micro-interações
- Loading/error states consistentes
- Testes E2E

---

## Comandos úteis

```bash
# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Limpar cache do Metro
npx expo start --web --clear

# Gerar tipos do Supabase (após mudanças no schema)
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```
