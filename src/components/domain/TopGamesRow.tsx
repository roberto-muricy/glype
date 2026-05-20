import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/src/components/ui';
import { TrophyIcon } from '@/src/components/ui/icons';
import { tokens } from '@/src/theme/tokens';
import type { FavoriteGame } from '@/src/types/models';

// ─── Empty CTA ────────────────────────────────────────────────────────────────

export interface TopGamesEmptyCTAProps {
  onPress: () => void;
}

/** Chamada para o usuário montar seu Top 5 (estado vazio). */
export function TopGamesEmptyCTA({ onPress }: TopGamesEmptyCTAProps) {
  return (
    <View className="mx-5 rounded-xl bg-bg-elevated border border-border-subtle p-4">
      {/* Topo: troféu + textos */}
      <View className="flex-row items-center gap-3">
        <View
          className="rounded-full bg-bg-surface items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <TrophyIcon size={20} color={tokens.color.brand.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-body text-text-primary font-medium">
            Monte seu Top 5
          </Text>
          <Text className="text-caption text-text-secondary mt-0.5">
            Mostre seus jogos favoritos no perfil
          </Text>
        </View>
      </View>

      {/* Prévia das 5 posições (slots fantasma) */}
      <View className="flex-row gap-2 mt-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <View
            key={n}
            className="flex-1 rounded-lg bg-bg-surface border border-border-subtle items-center justify-center"
            style={{ aspectRatio: 0.75 }}
          >
            <Text
              style={{
                fontFamily: tokens.fontFamily.monoMedium,
                fontSize: 13,
                color: tokens.color.text.tertiary,
              }}
            >
              {n}
            </Text>
          </View>
        ))}
      </View>

      {/* Botão */}
      <View className="mt-4">
        <Button label="Montar Top 5" size="sm" variant="primary" onPress={onPress} />
      </View>
    </View>
  );
}

// ─── Display Row ──────────────────────────────────────────────────────────────

export interface TopGamesRowProps {
  favorites: FavoriteGame[];
  onGamePress?: (rawgId: number) => void;
}

const COVER_W = 96;
const COVER_H = 128;

/** Linha horizontal mostrando o Top 5 ranqueado de um usuário. */
export function TopGamesRow({ favorites, onGamePress }: TopGamesRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
    >
      {favorites.map((fav) => (
        <Pressable
          key={fav.rank}
          onPress={() =>
            fav.game.rawg_id != null && onGamePress?.(fav.game.rawg_id)
          }
          accessibilityRole="button"
          accessibilityLabel={`#${fav.rank} ${fav.game.title}`}
          style={{ width: COVER_W }}
        >
          {/* Capa */}
          <View
            style={{
              width: COVER_W,
              height: COVER_H,
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {fav.game.cover_url ? (
              <Image
                source={{ uri: fav.game.cover_url }}
                style={{ width: COVER_W, height: COVER_H }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <LinearGradient
                colors={[tokens.color.brand.dark, tokens.color.bg.surface]}
                style={{
                  width: COVER_W,
                  height: COVER_H,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                }}
              >
                <Text
                  className="text-caption text-text-tertiary text-center"
                  numberOfLines={3}
                >
                  {fav.game.title}
                </Text>
              </LinearGradient>
            )}

            {/* Badge de posição */}
            <View
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: tokens.color.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#fff',
              }}
            >
              <Text
                style={{
                  fontFamily: tokens.fontFamily.monoMedium,
                  fontSize: 11,
                  color: '#fff',
                }}
              >
                {fav.rank}
              </Text>
            </View>
          </View>

          {/* Título */}
          <Text
            className="text-caption text-text-body mt-1.5"
            numberOfLines={2}
            style={{ lineHeight: 14 }}
          >
            {fav.game.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
