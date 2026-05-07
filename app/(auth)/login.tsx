import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Button, GlypeLogo, Input, Toast } from '@/src/components/ui';
import { tokens } from '@/src/theme/tokens';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email ou senha incorretos');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      {/* Gradient decorativo no topo */}
      <LinearGradient
        colors={[tokens.color.brand.dark, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-center px-6 gap-8">
          {/* Logo */}
          <View className="gap-3">
            <GlypeLogo size={40} tone="blue" />
            <Text className="text-body-lg text-text-secondary">
              Reviews de jogos PlayStation
            </Text>
          </View>

          {/* Campos */}
          <View className="gap-3">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              placeholder="Senha"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
              autoComplete="password"
              onSubmitEditing={onSubmit}
              returnKeyType="done"
            />
            {error && <Toast variant="danger" title={error} />}
          </View>

          {/* Ações */}
          <View className="gap-3">
            <Button
              label={submitting ? 'Entrando…' : 'Entrar'}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !email || !password}
              size="lg"
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
              accessibilityLabel="Components sandbox"
              hitSlop={8}
              className="rounded-pill border border-border bg-bg-elevated px-3 py-1.5"
            >
              <Text className="text-caption text-text-secondary">Components ↗</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
