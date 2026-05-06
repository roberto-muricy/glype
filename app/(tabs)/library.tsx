import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LibraryIcon } from '@/src/components/ui/icons';
import { tokens } from '@/src/theme/tokens';

export default function LibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-1">
        <EmptyState
          icon={<LibraryIcon size={28} color={tokens.color.brand.primary} />}
          title="Biblioteca em breve"
          subtitle="Organize jogos por status: jogando, jogados, wishlist e dropados."
        />
      </View>
    </SafeAreaView>
  );
}
