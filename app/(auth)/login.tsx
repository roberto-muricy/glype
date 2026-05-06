import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao entrar';
      Alert.alert('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-center px-6 gap-8">
          <View>
            <Text className="text-display-1 text-text-primary">Glype</Text>
            <Text className="text-body-lg text-text-secondary mt-2">
              Reviews de jogos PlayStation
            </Text>
          </View>

          <View className="gap-3">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <View className="gap-3">
            <Button
              label={submitting ? 'Entrando...' : 'Entrar'}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !email || !password}
            />
            <Link href="/(auth)/signup" asChild>
              <Button variant="ghost" label="Não tem conta? Cadastre-se" />
            </Link>
          </View>
        </View>

        {__DEV__ && (
          <View className="absolute bottom-8 right-6">
            <Pressable
              onPress={() => router.push('/dev/components')}
              accessibilityRole="button"
              accessibilityLabel="Components sandbox (DEV only)"
              hitSlop={8}
              className="rounded-pill border border-border bg-bg-elevated px-3 py-1.5"
            >
              <Text className="text-caption text-text-secondary">
                Components ↗
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
