import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Button, Input, Toast } from '@/src/components/ui';
import { tokens } from '@/src/theme/tokens';

function validate(username: string, email: string, password: string): string | null {
  if (username.trim().length < 3) return 'Username precisa ter no mínimo 3 caracteres';
  if (!/^[a-z0-9_]+$/i.test(username.trim())) return 'Username só pode ter letras, números e _';
  if (!email.includes('@')) return 'Email inválido';
  if (password.length < 6) return 'Senha precisa ter no mínimo 6 caracteres';
  return null;
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearError = () => setError(null);

  const onSubmit = async (): Promise<void> => {
    const validationError = validate(username, email, password);
    if (validationError) { setError(validationError); return; }

    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email: email.trim(), password, username: username.trim() });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      <LinearGradient
        colors={[tokens.color.brand.dark, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-8 py-8">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-display-1 text-text-primary">Criar conta</Text>
              <Text className="text-body-lg text-text-secondary">
                Junte-se à comunidade Glype
              </Text>
            </View>

            {success ? (
              /* Confirmação de email */
              <View className="gap-4">
                <Toast
                  variant="success"
                  title="Conta criada!"
                  description="Verifique seu email para confirmar o cadastro antes de fazer login."
                />
                <Link href="/(auth)/login" asChild>
                  <Button label="Ir para o login" size="lg" />
                </Link>
              </View>
            ) : (
              <>
                {/* Campos */}
                <View className="gap-3">
                  <View>
                    <Input
                      placeholder="Username"
                      value={username}
                      onChangeText={(v) => { setUsername(v); clearError(); }}
                      autoCapitalize="none"
                      autoComplete="username"
                    />
                    <Text className="text-caption text-text-tertiary mt-1 ml-1">
                      Letras, números e _ · mínimo 3 caracteres
                    </Text>
                  </View>
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError(); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  <Input
                    placeholder="Senha"
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError(); }}
                    secureTextEntry
                    autoComplete="password-new"
                    onSubmitEditing={onSubmit}
                    returnKeyType="done"
                  />
                  {error && <Toast variant="danger" title={error} />}
                </View>

                {/* Ações */}
                <View className="gap-3">
                  <Button
                    label={submitting ? 'Criando conta…' : 'Criar conta'}
                    onPress={onSubmit}
                    loading={submitting}
                    disabled={submitting || !username || !email || !password}
                    size="lg"
                  />
                  <Link href="/(auth)/login" asChild>
                    <Button variant="ghost" label="Já tem conta? Faça login" />
                  </Link>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
