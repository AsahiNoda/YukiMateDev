import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { reportError } from '@/lib/sentry';
import { Colors } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * グローバルエラーバウンダリ
 * アプリ全体でキャッチされていないReactエラーを捕捉し、
 * アプリクラッシュを防ぐ
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // エラーが発生したことを記録
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー詳細を保存
    this.setState({
      error,
      errorInfo,
    });

    // Sentryにエラーを報告
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    reportError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  handleReset = () => {
    // エラー状態をリセット
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return <ErrorBoundaryFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * テーマ対応のエラーバウンダリフォールバックUI
 */
function ErrorBoundaryFallback({
  error,
  errorInfo,
  onReset
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={[styles.title, { color: theme.text }]}>エラーが発生しました</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          申し訳ございません。予期しないエラーが発生しました。
        </Text>

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.errorTitle, { color: theme.text }]}>エラー詳細（開発モードのみ）:</Text>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error.toString()}</Text>
            {errorInfo && (
              <>
                <Text style={[styles.errorTitle, { color: theme.text }]}>コンポーネントスタック:</Text>
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                  {errorInfo.componentStack}
                </Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={onReset}>
          <Text style={styles.buttonText}>再試行</Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          問題が解決しない場合は、アプリを再起動してください。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
