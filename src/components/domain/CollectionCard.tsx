import { Pressable, Text, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/src/components/ui';
import { tokens } from '@/src/theme/tokens';
import type { CollectionDef } from '@/src/config/collections';
import type { Game } from '@/src/types/models';

export interface CollectionCardProps {
  collection: CollectionDef;
  /** Primeiros 3 jogos pra mostrar as capas (pode ser undefined enquanto carrega) */
  previewGames?: Game[];
  loading?: boolean;
  onPress: () => void;
}

const CARD_WIDTH = 180;
const CARD_HEIGHT = 210;
const COVER_W = 70;
const COVER_H = 95;

export function CollectionCard({
  collection,
  previewGames,
  loading = false,
  onPress,
}: CollectionCardProps) {
  const covers = (previewGames ?? []).slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collection.title}
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Fundo com gradiente da coleção */}
      <LinearGradient
        colors={[collection.color, collection.colorDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Overlay escuro na metade inferior (legibilidade do texto) */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.55 }}
      />

      {/* Preview de capas — stack com leve rotação */}
      <View
        style={{
          position: 'absolute',
          top: 12,
          right: 10,
          width: COVER_W + 28,
          height: COVER_H + 14,
        }}
      >
        {loading
          ? // Skeleton placeholders
            [0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  right: i * 10,
                  top: i * 5,
                  width: COVER_W,
                  height: COVER_H,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  transform: [{ rotate: `${(i - 1) * 4}deg` }],
                }}
              />
            ))
          : covers.map((game, i) => (
              <View
                key={game.rawg_id ?? i}
                style={{
                  position: 'absolute',
                  right: (covers.length - 1 - i) * 10,
                  top: (covers.length - 1 - i) * 4,
                  width: COVER_W,
                  height: COVER_H,
                  borderRadius: 8,
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.2)',
                  transform: [{ rotate: `${(i - 1) * 3}deg` }],
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                {game.cover_url ? (
                  <Image
                    source={{ uri: game.cover_url }}
                    style={{ width: COVER_W, height: COVER_H }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={collection.icon} size={24} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
              </View>
            ))}

        {/* Se não tiver jogos ainda, mostra ícone centralizado */}
        {!loading && covers.length === 0 && (
          <View
            style={{
              width: COVER_W + 28,
              height: COVER_H + 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={collection.icon} size={36} color="rgba(255,255,255,0.85)" />
          </View>
        )}
      </View>

      {/* Texto no rodapé */}
      <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
        <Text
          style={{
            fontFamily: tokens.fontFamily.medium,
            fontSize: 14,
            color: '#FFFFFF',
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {collection.title}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {collection.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
