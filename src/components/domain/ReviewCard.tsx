import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { cn } from '@/src/utils/cn';
import { tokens } from '@/src/theme/tokens';
import { hapticLight } from '@/src/utils/haptics';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { Card } from '../ui/Card';
import { HeartIcon, HeartOutlineIcon } from '../ui/icons';
import { ScoreBadge } from './ScoreBadge';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ReviewCardTag {
  label: string;
  variant: 'success' | 'danger' | 'neutral';
}

export interface ReviewCardProps {
  variant?: 'compact' | 'full';
  user: {
    username: string;
    avatarUrl?: string | null;
    onPress?: () => void;
  };
  game?: {
    title: string;
  };
  score: number;
  body: string;
  tags?: ReviewCardTag[];
  liked?: boolean;
  likesCount?: number;
  onLikePress?: () => void;
  className?: string;
}

/** Card de review. `full` inclui header com nome do jogo. */
export function ReviewCard({
  variant = 'compact',
  user,
  game,
  score,
  body,
  tags,
  liked = false,
  likesCount = 0,
  onLikePress,
  className,
}: ReviewCardProps) {
  const HeartComponent = liked ? HeartIcon : HeartOutlineIcon;
  const heartColor = liked ? tokens.color.semantic.danger : tokens.color.text.secondary;
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const handleLikePress = () => {
    hapticLight();
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    onLikePress?.();
  };

  return (
    <Card variant="default" padding="md" className={cn(className)}>
      {variant === 'full' && game != null && (
        <Text className="text-section uppercase text-brand-muted mb-2">
          {game.title}
        </Text>
      )}

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={user.onPress}
          disabled={!user.onPress}
          className="flex-row items-center gap-2"
          accessibilityRole={user.onPress ? 'button' : undefined}
          accessibilityLabel={user.onPress ? `Ver perfil de ${user.username}` : undefined}
          hitSlop={4}
        >
          <Avatar name={user.username} uri={user.avatarUrl} size="sm" />
          <Text className="text-body font-medium text-text-primary">
            {user.username}
          </Text>
        </Pressable>
        <ScoreBadge score={score} size="sm" />
      </View>

      <Text
        className="text-body-lg text-text-body mt-3"
        numberOfLines={variant === 'compact' ? 4 : undefined}
      >
        {body}
      </Text>

      {tags != null && tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {tags.map((t) => (
            <Tag key={t.label} label={t.label} variant={t.variant} />
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-end mt-3">
        <AnimatedPressable
          onPress={handleLikePress}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Descurtir review' : 'Curtir review'}
          accessibilityState={{ selected: liked }}
          hitSlop={8}
          className="flex-row items-center gap-1.5"
        >
          <Animated.View style={heartStyle}>
            <HeartComponent size={16} color={heartColor} />
          </Animated.View>
          <Text className="text-caption text-text-secondary">{likesCount}</Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
}
