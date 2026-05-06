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
} as const;

interface CacheRow {
  payload: unknown;
  expires_at: string;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('cache_meta')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .maybeSingle<CacheRow>();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function setCache(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const supabase = getServiceClient();
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase
    .from('cache_meta')
    .upsert({ cache_key: key, payload, expires_at }, { onConflict: 'cache_key' });
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = await getCache<T>(key);
  if (hit) return hit;
  const fresh = await fetcher();
  // Best-effort: se gravar no cache falhar, retornamos o dado fresco mesmo assim.
  try {
    await setCache(key, fresh, ttlSeconds);
  } catch (_e) {
    // ignore
  }
  return fresh;
}

export function makeCacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p).toLowerCase().trim()).join(':');
}
