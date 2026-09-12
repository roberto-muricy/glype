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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/hooks/useAuth';
import { Button, Input, Toast } from '@/src/components/ui';
import { tokens } from '@/src/theme/tokens';

function validate(
  username: string,
  email: string,
  password: string,
  t: (key: string) => string,
): string | null {
  if (username.trim().length < 3) return t('auth.validationUsernameMin');
  if (!/^[a-z0-9_]+$/i.test(username.trim())) return t('auth.validationUsernameChars');
  if (!email.includes('@')) return t('auth.validationEmailInvalid');
  if (password.length < 6) return t('auth.validationPasswordMin');
  return null;
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearError = () => setError(null);

  const onSubmit = async (): Promise<void> => {
    const validationError = validate(username, email, password, t);
    if (validationError) { setError(validationError); return; }

    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email: email.trim(), password, username: username.trim() });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.errorSigningUp'));
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-8 py-8">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-display-1 text-text-primary">{t('auth.signUp')}</Text>
              <Text className="text-body-lg text-text-secondary">
                {t('auth.signupSubtitle')}
              </Text>
            </View>

            {success ? (
              /* Confirmação de email */
              <View className="gap-4">
                <Toast
                  variant="success"
                  title={t('auth.accountCreated')}
                  description={t('auth.accountCreatedDesc')}
                />
                <Link href="/(auth)/login" asChild>
                  <Button label={t('auth.goToLogin')} size="lg" />
                </Link>
              </View>
            ) : (
              <>
                {/* Campos */}
                <View className="gap-3">
                  <View>
                    <Input
                      placeholder={t('auth.username')}
                      value={username}
                      onChangeText={(v) => { setUsername(v); clearError(); }}
                      autoCapitalize="none"
                      // Username/email não são palavras de dicionário: a
                      // autocorreção do iOS as reescreve e quebra o cadastro.
                      autoCorrect={false}
                      spellCheck={false}
                      autoComplete="username"
                      textContentType="username"
                    />
                    <Text className="text-caption text-text-tertiary mt-1 ml-1">
                      {t('auth.usernameHint')}
                    </Text>
                  </View>
                  <Input
                    placeholder={t('auth.email')}
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError(); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                  <Input
                    placeholder={t('auth.password')}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError(); }}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    onSubmitEditing={onSubmit}
                    returnKeyType="done"
                  />
                  {error && <Toast variant="danger" title={error} />}
                </View>

                {/* Ações */}
                <View className="gap-3">
                  <Button
                    label={submitting ? t('auth.creatingAccount') : t('auth.signUp')}
                    onPress={onSubmit}
                    loading={submitting}
                    disabled={submitting || !username || !email || !password}
                    size="lg"
                  />
                  <Link href="/(auth)/login" asChild>
                    <Button variant="ghost" label={t('auth.hasAccountLogin')} />
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
