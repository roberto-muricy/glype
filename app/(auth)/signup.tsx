import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

// Tela funcional mínima — sem styling. UI polida vem na Fase 3.
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
    <View>
      <Text>Cadastro</Text>

      <Text>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username"
      />

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
        autoComplete="password-new"
      />

      <Button
        title={submitting ? 'Criando...' : 'Criar conta'}
        onPress={onSubmit}
        disabled={submitting || !username || !email || !password}
      />

      <Link href="/(auth)/login">
        <Text>Já tem conta? Faça login</Text>
      </Link>
    </View>
  );
}
