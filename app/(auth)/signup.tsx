import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (username.trim().length < 3) return 'Username precisa de no mínimo 3 caracteres';
    if (!email.includes('@')) return 'Email inválido';
    if (password.length < 6) return 'Senha precisa de no mínimo 6 caracteres';
    return null;
  };

  const onSubmit = async (): Promise<void> => {
    const error = validate();
    if (error) {
      Alert.alert('Erro', error);
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ email: email.trim(), password, username: username.trim() });
      Alert.alert(
        'Quase lá',
        'Verifique seu email para confirmar a conta antes de fazer login.',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar conta';
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
            <Text className="text-display-1 text-text-primary">Criar conta</Text>
            <Text className="text-body-lg text-text-secondary mt-2">
              Junte-se à comunidade Glype
            </Text>
          </View>

          <View className="gap-3">
            <Input
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
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
              autoComplete="password-new"
            />
          </View>

          <View className="gap-3">
            <Button
              label={submitting ? 'Criando...' : 'Criar conta'}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !username || !email || !password}
            />
            <Link href="/(auth)/login" asChild>
              <Button variant="ghost" label="Já tem conta? Faça login" />
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
