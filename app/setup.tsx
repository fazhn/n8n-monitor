import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveN8nConfig } from '@/services/storage';

export default function SetupScreen() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Validate inputs
    if (!serverUrl.trim() || !apiKey.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(serverUrl.trim())) {
      Alert.alert(
        'URL Inválida',
        'La URL debe comenzar con http:// o https://\nEjemplo: https://n8n.example.com'
      );
      return;
    }

    setLoading(true);

    try {
      // Remove trailing slash from URL
      const cleanUrl = serverUrl.trim().replace(/\/$/, '');

      await saveN8nConfig({
        serverUrl: cleanUrl,
        apiKey: apiKey.trim(),
      });

      Alert.alert('¡Listo!', 'Configuración guardada correctamente', [
        {
          text: 'OK',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Configurar n8n</Text>
          <Text style={styles.subtitle}>
            Conecta tu instancia de n8n para comenzar a monitorear tus flujos
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>URL del Servidor</Text>
              <TextInput
                style={styles.input}
                placeholder="https://n8n.example.com"
                placeholderTextColor="#999"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
              <Text style={styles.hint}>
                La URL completa de tu instancia de n8n
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="n8n_api_xxxxxxxxxxxxx"
                placeholderTextColor="#999"
                value={apiKey}
                onChangeText={setApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!loading}
              />
              <Text style={styles.hint}>
                Genera tu API key en n8n → Settings → n8n API
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Guardar Configuración</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  hint: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
