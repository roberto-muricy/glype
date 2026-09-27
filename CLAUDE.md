# Notas para o Claude

Complemento do `README.md`, com o que já custou caro aprender.

## Publicar EAS Update (OTA)

```bash
npx eas-cli update --channel production --environment production --message "..."
```

O `--environment production` é **obrigatório**. Sem ele a CLI não carrega variável
nenhuma — nem do EAS, nem do `.env` local — e o app sai publicado sem
`supabaseUrl` no manifesto, ou seja, sem falar com o servidor.

Toda variável `EXPO_PUBLIC_*` precisa existir em **dois** lugares:

| Onde | Quem usa |
|---|---|
| `eas.json`, em `build.*.env` | EAS Build (builds nativos) |
| Ambiente `production` do EAS | `eas update` (OTA) |
| `.env` local | `npm start` no seu Mac |

Cadastrar uma nova: `npx eas-cli env:set --name X --value Y --environment production --visibility plaintext --scope project`.
As chaves de cliente (URL do Supabase, chave publishable, IDs do OAuth) são
públicas por natureza e já estão versionadas. A `SUPABASE_SERVICE_ROLE_KEY`
nunca vai para o EAS nem para o app.

### Conferir o que foi publicado

O manifesto servido aos aparelhos mostra o `extra` real. Vale conferir sempre,
porque um update sem configuração quebra o app sem gerar erro no publish:

```bash
curl -s -H "expo-platform: ios" -H "expo-runtime-version: 1.1.2" \
  -H "expo-channel-name: production" -H "expo-protocol-version: 1" \
  -H "accept: multipart/mixed" \
  "https://u.expo.dev/76ed59a4-4e45-4b2a-b1ab-eb531696ff95" \
  | grep -c supabaseAnonKey
```

### Desfazer

```bash
npx eas-cli update:roll-back-to-embedded --channel production --runtime-version 1.1.2 --message "..."
```

O `--runtime-version` é obrigatório em modo não interativo. O rollback devolve
os aparelhos ao bundle que veio dentro do app, e qualquer update publicado
depois o substitui.

### Source maps

O `eas update` **não** envia source maps. Depois de publicar:

```bash
npx eas-cli env:exec production "npx sentry-expo-upload-sourcemaps dist"
```

Precisa rodar com o `dist/` do publish, senão os debug IDs não casam.

## Analytics (PostHog EU)

**Telas não precisam ser instrumentadas.** O `ScreenTracker`, no layout raiz,
reporta cada rota como `$screen` — o evento padrão do PostHog, que alimenta os
relatórios de sessão, bounce e funil por tela. O nome é o padrão da rota
(`game/[rawgId]`), então ID não vira tela nova. Em dev cada tela aparece no
console como `[analytics] $screen <nome>`.

Eventos de ação usam `track()`, em `snake_case`, com o id do Supabase quando
precisar identificar alguém — nunca email nem nome.

| Área | Eventos |
|---|---|
| Sessão | `$screen` (automático); instalação, abertura e background vêm do `captureAppLifecycleEvents` |
| Cadastro e login | `signup_succeeded` / `signup_failed`, `signin_succeeded` / `signin_failed` / `signin_canceled`, `signout`, `account_deleted` — todos com `method` (`email`, `apple`, `google`) |
| Onboarding | `onboarding_started`, `onboarding_step_completed` (`step`, `name`, `skipped`, `count`), `onboarding_finished` (`last_step`) |
| Review | `review_game_picked`, `review_editor_opened` (`mode`), `review_editor_abandoned` (`mode`, `had_body`), `review_created`, `review_updated`, `review_deleted` |
| Deck | `discover_opened` (`source`), `discover_swipe_left` / `right`, `discover_view_details`, `discover_queue_exhausted` |
| Biblioteca e social | `game_added_to_library`, `game_removed_from_library`, `user_followed` / `user_unfollowed`, `comment_created` / `comment_deleted`, `content_reported`, `user_blocked` / `user_unblocked` |
| Outros | `collection_opened`, `language_changed` |

Dois funis montam sozinhos a partir disso:

- **Cadastro:** `$screen login` → `signin_succeeded` → `onboarding_finished` → `review_created`
- **Review:** `$screen review/pick-game` → `review_game_picked` → `review_editor_opened` → `review_created`, com `review_editor_abandoned` mostrando quem desistiu no editor

O primeiro login com Apple ou Google dispara **os dois**, `signin_succeeded` e
`signup_succeeded` — a conta recém-criada é reconhecida pelo `created_at` de
menos de um minuto. Sem isso, cadastro por login social não contava como
cadastro em lugar nenhum.

Evento novo entra nesta tabela. É o que evita dois nomes para a mesma coisa.

## Banco de dados

- `npx supabase db push --linked` roda o usuário. O classificador bloqueia esse
  comando para o Claude.
- Admins que recebem alerta de denúncia ficam em `app_admins` (migration 0012).
  A tabela não tem policy: só service_role e funções SECURITY DEFINER a leem.
  Inserir admin é escrita em produção — pedir autorização antes.

## Ambiente

- `zsh` não faz word splitting de `$VAR`: use `${=VAR}`, `xargs` ou argumentos
  explícitos, e cite padrões de glob (`--include='*.ts'`).
- `timeout` não existe no macOS.
- `expo lint` acusa erros em `supabase/functions` (imports remotos do Deno que o
  ESLint não resolve). É ruído conhecido, não regressão.
