import { View, Text, Button, Alert } from 'react-native';
import { useAuth } from '@/src/hooks/useAuth';

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
    <View>
      <Text>Perfil</Text>
      <Text>username: {profile?.username ?? '—'}</Text>
      <Text>email: {user?.email ?? '—'}</Text>
      <Text>id: {user?.id ?? '—'}</Text>
      <Button title="Sair" onPress={onSignOut} />
    </View>
  );
}
