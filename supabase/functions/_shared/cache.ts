// Cache helper para Edge Functions, persistido em `cache_meta`.
// Usa o service_role client (que bypassa RLS) — a tabela é read/write
// só pra service_role.
//
// Padrão: TTL por tipo de query. As Edge Functions chamam withCache(key, ttl, fn).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

let cachedClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas');
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export const CACHE_TTL = {
  search: 60 * 60 * 1, // 1h
  detail: 60 * 60 * 24 * 7, // 7d
  trending: 60 * 60 * 6, // 6h
  recommendations: 60 * 60 * 24, // 24h
  discover: 60 * 60 * 1, // 1h — pool do swipe deck, curto pra manter freshness
} as const;

interface CacheRow {
  payload: unknown;
  expires_at: string;
}

export interface CacheEntry<T> {
  payload: T;
  /** false = passou do TTL. Ainda serve quando a RAWG está fora do ar. */
  fresh: boolean;
}

/**
 * Lê a linha do cache mesmo vencida. As linhas nunca são apagadas, e isso é
 * o que mantém o app de pé quando a RAWG cai: em novembro de 2026 ela ficou
 * mais de uma semana sem responder, e tudo que dependia dela virou erro.
 */
export async function getCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('cache_meta')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .maybeSingle<CacheRow>();
  // Erro não é miss: tratar os dois igual escondeu por meses que a cache_meta
  // nem existia em produção. Continua retornando null, mas deixa rastro no log.
  if (error) {
    console.error(`[cache] getCache(${key}) falhou:`, error.message);
    return null;
  }
  if (!data) return null;
  return {
    payload: data.payload as T,
    fresh: new Date(data.expires_at).getTime() >= Date.now(),
  };
}

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = await getCacheEntry<T>(key);
  return entry?.fresh ? entry.payload : null;
}

export async function setCache(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const supabase = getServiceClient();
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  // supabase-js não lança em erro de query — devolve `error`. Sem checar aqui,
  // o try/catch de quem chama nunca pega nada.
  const { error } = await supabase
    .from('cache_meta')
    .upsert({ cache_key: key, payload, expires_at }, { onConflict: 'cache_key' });
  if (error) throw new Error(`setCache(${key}): ${error.message}`);
}

/** Lança quando a RAWG está marcada como fora e não há cópia para servir. */
export class UpstreamDownError extends Error {
  constructor() {
    super('RAWG fora do ar');
    this.name = 'UpstreamDownError';
  }
}

/**
 * Depois de uma falha, quanto tempo pular a RAWG direto. Sem isso, toda
 * chamada esperava os 10s do timeout antes de cair na cópia do cache.
 */
const UPSTREAM_DOWN_SECONDS = 600;
const UPSTREAM_DOWN_KEY = 'upstream:rawg:down';
/** Atalho no próprio isolate, para não ir ao banco a cada miss. */
let upstreamDownUntil = 0;

export async function isUpstreamDown(): Promise<boolean> {
  if (Date.now() < upstreamDownUntil) return true;
  // Outros isolates também precisam saber, por isso a marca fica no banco.
  return (await getCache<boolean>(UPSTREAM_DOWN_KEY)) === true;
}

export async function markUpstreamDown(): Promise<void> {
  upstreamDownUntil = Date.now() + UPSTREAM_DOWN_SECONDS * 1000;
  try {
    await setCache(UPSTREAM_DOWN_KEY, true, UPSTREAM_DOWN_SECONDS);
  } catch (e) {
    console.error('[cache]', e instanceof Error ? e.message : e);
  }
}

/**
 * Falha da RAWG como serviço (timeout, rede, 5xx, limite de requisições), e não
 * de uma chamada específica: um 404 de um jogo não pode desligar a RAWG para
 * todo mundo por dois minutos.
 */
export function isOutageError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /não respondeu|indisponível|RAWG (5\d\d|429)|fetch failed|error sending request|connection|network/i.test(message);
}

function isEmptyPayload(value: unknown): boolean {
  return value == null || (Array.isArray(value) && value.length === 0);
}

/**
 * Cache com reserva. Ordem:
 * 1. cópia dentro do TTL;
 * 2. com a RAWG marcada como fora, a cópia vencida (sem esperar o timeout);
 * 3. busca nova — que só vai ao cache se vier com conteúdo;
 * 4. se a busca falhar, a cópia vencida.
 *
 * Lista vazia nunca substitui uma cópia boa: era assim que uma RAWG fora do
 * ar deixava as recomendações vazias por 24h.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = await getCacheEntry<T>(key);
  const usable = entry && !isEmptyPayload(entry.payload) ? entry : null;
  if (usable?.fresh) return usable.payload;

  if (await isUpstreamDown()) {
    if (usable) return usable.payload;
    throw new UpstreamDownError();
  }

  let fresh: T;
  try {
    fresh = await fetcher();
  } catch (e) {
    if (isOutageError(e)) await markUpstreamDown();
    if (usable) {
      console.error(`[cache] ${key}: servindo cópia vencida;`, e instanceof Error ? e.message : e);
      return usable.payload;
    }
    throw e;
  }

  if (isEmptyPayload(fresh)) return usable ? usable.payload : fresh;

  // Best-effort: se gravar no cache falhar, retornamos o dado fresco mesmo assim.
  try {
    await setCache(key, fresh, ttlSeconds);
  } catch (e) {
    console.error('[cache]', e instanceof Error ? e.message : e);
  }
  return fresh;
}

export function makeCacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p).toLowerCase().trim()).join(':');
}
