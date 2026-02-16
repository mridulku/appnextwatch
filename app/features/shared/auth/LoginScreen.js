import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';

import COLORS from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';

function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('demo user');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const result = login(username, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NEXTWATCH ACCESS</Text>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            Sign in with the demo account to continue.
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="demo user"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="password123"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              style={styles.input}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log in</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Demo credentials: demo user / password123
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
  },
  eyebrow: {
    color: COLORS.accent2,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    marginTop: 10,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  fieldGroup: {
    marginTop: 16,
  },
  label: {
    color: COLORS.muted,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    backgroundColor: COLORS.cardSoft,
  },
  errorText: {
    color: '#E07A7A',
    marginTop: 12,
  },
  button: {
    marginTop: 18,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.bg,
    fontWeight: '600',
    fontSize: 16,
  },
  helperText: {
    color: COLORS.muted,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default LoginScreen;
