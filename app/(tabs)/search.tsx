import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SearchTabIcon } from '@/src/components/ui/icons';
import { tokens } from '@/src/theme/tokens';

export default function SearchScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-1">
        <EmptyState
          icon={<SearchTabIcon size={28} color={tokens.color.brand.primary} />}
          title="Busca em breve"
          subtitle="Encontre jogos do PS4 e PS5 e descubra reviews da comunidade."
        />
      </View>
    </SafeAreaView>
  );
}
