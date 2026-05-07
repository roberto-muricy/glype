/**
 * Seed ~30 jogos populares de PS4/PS5 na tabela `games`.
 *
 * Uso:
 *   npx tsx scripts/seed-popular-games.ts
 *
 * Requer no .env:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Estratégia: busca cada jogo por nome via games-search, pega o primeiro
 * resultado e upserta via ensure-game. Mais confiável do que IDs fixos.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('❌  Defina EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Lista curada de títulos ──────────────────────────────────────────────────
const GAME_TITLES = [
  'God of War 2018',
  'God of War Ragnarok',
  'The Last of Us Part I',
  'The Last of Us Part II',
  "Marvel's Spider-Man",
  "Marvel's Spider-Man Miles Morales",
  "Marvel's Spider-Man 2",
  'Bloodborne',
  'Elden Ring',
  'Ghost of Tsushima',
  'Horizon Zero Dawn',
  'Horizon Forbidden West',
  'Ratchet and Clank Rift Apart',
  'Demon\'s Souls 2020',
  'Returnal PS5',
  'Gran Turismo 7',
  'Uncharted 4 A Thief\'s End',
  'The Witcher 3 Wild Hunt',
  'Grand Theft Auto V',
  'Cyberpunk 2077',
  'Red Dead Redemption 2',
  'Death Stranding',
  'Control 2019',
  'Sekiro Shadows Die Twice',
  'Hollow Knight',
  'Stray 2022',
  'Final Fantasy VII Remake',
  'Resident Evil Village',
  'Resident Evil 2 Remake',
  'Dark Souls III',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

interface SearchResult {
  results: { rawg_id: number | null; title: string }[];
}

async function searchGame(title: string): Promise<number | null> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/games-search`);
  url.searchParams.set('q', title);
  url.searchParams.set('page_size', '3');

  const res = await fetch(url.toString(), { headers: { apikey: ANON_KEY } });
  if (!res.ok) return null;

  const data = await res.json() as SearchResult;
  const first = data.results?.[0];
  return first?.rawg_id ?? null;
}

async function ensureGame(rawgId: number): Promise<{ id: string; title: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ensure-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ rawg_id: rawgId }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`    ensure-game falhou: ${res.status} ${text.slice(0, 120)}`);
    return null;
  }
  return res.json() as Promise<{ id: string; title: string }>;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎮  Seeding ${GAME_TITLES.length} jogos por nome…\n`);
  let success = 0;
  let failed = 0;

  for (const title of GAME_TITLES) {
    process.stdout.write(`  → "${title}" … `);

    try {
      // 1. Busca rawg_id pelo nome
      const rawgId = await searchGame(title);
      if (!rawgId) {
        console.log('⚠️  não encontrado na busca');
        failed++;
        await sleep(300);
        continue;
      }

      // 2. Verifica se já existe
      const { data: existing } = await supabase
        .from('games')
        .select('title')
        .eq('rawg_id', rawgId)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  já existe: ${existing.title}`);
        success++;
        await sleep(200);
        continue;
      }

      // 3. Upserta via ensure-game
      const game = await ensureGame(rawgId);
      if (!game) {
        failed++;
        await sleep(300);
        continue;
      }

      console.log(`✅  ${game.title} (rawg_id=${rawgId})`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌  ${msg}`);
      failed++;
    }

    await sleep(300); // rate limit gentil
  }

  console.log(`\n✨  Concluído: ${success} ok, ${failed} erros.\n`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
