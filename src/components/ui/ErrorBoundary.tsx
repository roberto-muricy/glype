// Error Boundary global — captura crashes não tratados na árvore React e
// envia pro Sentry. Renderiza um fallback simples ao invés da tela branca.
//
// Wrap no topo do _layout.tsx.

import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { captureException } from '@/src/lib/sentry';
import { tokens } from '@/src/theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    captureException(error, {
      componentStack: info.componentStack ?? null,
      boundary: 'root',
    });
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.color.bg.primary,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontFamily.medium,
            fontSize: 18,
            color: tokens.color.text.primary,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Algo deu errado
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontFamily.regular,
            fontSize: 13,
            color: tokens.color.text.secondary,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 18,
          }}
        >
          Ocorreu um erro inesperado. Já registramos o problema — tente novamente.
        </Text>
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: tokens.color.brand.primary,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontFamily.medium,
              fontSize: 14,
              color: '#fff',
            }}
          >
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    );
  }
}
