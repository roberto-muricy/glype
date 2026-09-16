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
curl -s -H "expo-platform: ios" -H "expo-runtime-version: 1.1.1" \
  -H "expo-channel-name: production" -H "expo-protocol-version: 1" \
  -H "accept: multipart/mixed" \
  "https://u.expo.dev/76ed59a4-4e45-4b2a-b1ab-eb531696ff95" \
  | grep -c supabaseAnonKey
```

### Desfazer

```bash
npx eas-cli update:roll-back-to-embedded --channel production --runtime-version 1.1.1 --message "..."
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
