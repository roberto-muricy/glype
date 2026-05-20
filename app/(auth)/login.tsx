import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Button, GlypeLogo, Input, Toast } from '@/src/components/ui';
import { tokens } from '@/src/theme/tokens';

export default function LoginScreen() {
  const { signIn, signInWithApple, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socialBusy = appleLoading || googleLoading;

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

  const onAppleSignIn = async (): Promise<void> => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
      // Navigation handled automatically by AuthGate / onAuthStateChange
    } catch (e: unknown) {
      // ERR_REQUEST_CANCELED = user dismissed the sheet — silent
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      setError(e instanceof Error ? e.message : 'Erro ao entrar com Apple');
    } finally {
      setAppleLoading(false);
    }
  };

  const onGoogleSignIn = async (): Promise<void> => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation handled automatically by AuthGate / onAuthStateChange
    } catch (e: unknown) {
      // SIGN_IN_CANCELLED (code '12501' / 'SIGN_IN_CANCELLED') = usuário fechou — silencioso
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : '';
      if (code.includes('CANCEL') || code === '12501' || code === '-5') {
        return;
      }
      setError(e instanceof Error ? e.message : 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
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
              disabled={submitting || socialBusy || !email || !password}
              size="lg"
            />

            {/* Separador */}
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-border-subtle" />
              <Text style={{ fontFamily: tokens.fontFamily.regular, fontSize: 12, color: tokens.color.text.tertiary }}>
                ou
              </Text>
              <View className="flex-1 h-px bg-border-subtle" />
            </View>

            {/* Apple Sign In — disponível apenas no iOS */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={12}
                style={{ height: 48 }}
                onPress={onAppleSignIn}
              />
            )}

            {/* Google Sign In — iOS + Android */}
            <Pressable
              onPress={onGoogleSignIn}
              disabled={socialBusy}
              accessibilityRole="button"
              accessibilityLabel="Continuar com Google"
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: pressed || socialBusy ? 0.85 : 1,
              })}
            >
              <Ionicons name="logo-google" size={18} color="#1F1F1F" />
              <Text
                style={{
                  fontFamily: tokens.fontFamily.medium,
                  fontSize: 15,
                  color: '#1F1F1F',
                }}
              >
                {googleLoading ? 'Entrando…' : 'Continuar com Google'}
              </Text>
            </Pressable>

            <Link href="/(auth)/signup" asChild>
              <Button variant="ghost" label="Não tem conta? Cadastre-se" disabled={socialBusy} />
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
