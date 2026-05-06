import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();

  const onSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao sair';
      Alert.alert('Erro', msg);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <View className="flex-1 px-5 gap-6">
        <View className="items-center gap-3 pt-8">
          <Avatar size="lg" name={profile?.username ?? user?.email ?? '?'} />
          <View className="items-center">
            <Text className="text-h1 text-text-primary">
              {profile?.username ?? '—'}
            </Text>
            {user?.email != null && (
              <Text className="text-body text-text-secondary mt-1">
                {user.email}
              </Text>
            )}
          </View>
        </View>

        <Card variant="default" padding="md">
          <Text className="text-section uppercase text-brand-muted mb-2">
            ID
          </Text>
          <Text
            className="text-caption text-text-body"
            selectable
            numberOfLines={1}
          >
            {user?.id ?? '—'}
          </Text>
        </Card>

        <Button label="Sair" variant="secondary" onPress={onSignOut} />
      </View>
    </SafeAreaView>
  );
}
