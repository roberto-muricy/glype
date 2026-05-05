import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

// Tela funcional mínima — sem styling. UI polida vem na Fase 3.
export default function LoginScreen() {
  const { signIn } = useAuth();
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
    <View>
      <Text>Login</Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <Text>Senha</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      <Button
        title={submitting ? 'Entrando...' : 'Entrar'}
        onPress={onSubmit}
        disabled={submitting || !email || !password}
      />

      <Link href="/(auth)/signup">
        <Text>Não tem conta? Cadastre-se</Text>
      </Link>
    </View>
  );
}
