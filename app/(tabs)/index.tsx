import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { HomeIcon } from '@/src/components/ui/icons';
import { tokens } from '@/src/theme/tokens';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-1">
        <EmptyState
          icon={<HomeIcon size={28} color={tokens.color.brand.primary} />}
          title="Home em breve"
          subtitle="Aqui virá o feed dos seus amigos e jogos em alta."
        />
      </View>
    </SafeAreaView>
  );
}
