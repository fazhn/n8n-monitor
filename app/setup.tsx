import {
    getActiveServerId,
    getServers,
    removeServer,
    saveServer,
    setActiveServerId
} from '@/services/storage';
import { N8nServer } from '@/types/n8n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Spotify-inspired Theme Constants
const THEME = {
  background: '#121212',
  surface: '#181818',
  surfaceHighlight: '#282828',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  accent: '#EA4B71', // n8n Primary
  success: '#22c55e',
  error: '#FF5252',
};

export default function SetupScreen() {
  const router = useRouter();
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  // Data State
  const [servers, setServers] = useState<N8nServer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingConfig(true);
      const serverList = await getServers();
      const currentActive = await getActiveServerId();
      
      setServers(serverList);
      setActiveId(currentActive || (serverList.length > 0 ? serverList[0].id : null));
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSelectServer = (server: N8nServer) => {
      setEditingId(server.id);
      setName(server.name);
      setServerUrl(server.serverUrl);
      setApiKey(server.apiKey);
  };

  const handleActivate = async (id: string) => {
      await setActiveServerId(id);
      setActiveId(id);
      Alert.alert('Servidor Activo', 'Has cambiado el servidor activo.');
  };

  const handleDelete = async (id: string) => {
      Alert.alert(
          'Eliminar Servidor',
          '¿Estás seguro? Esto no se puede deshacer.',
          [
              { text: 'Cancelar', style: 'cancel' },
              { 
                  text: 'Eliminar', 
                  style: 'destructive',
                  onPress: async () => {
                      await removeServer(id);
                      if (editingId === id) resetForm();
                      loadData();
                  }
              }
          ]
      );
  };

  const resetForm = () => {
      setEditingId(null);
      setName('');
      setServerUrl('');
      setApiKey('');
  };

  const testConnection = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      Alert.alert('Error', 'Por favor completa URL y API Key para probar');
      return;
    }

    setTesting(true);

    try {
      let testUrl = serverUrl.trim();
      testUrl = testUrl.replace(/\/$/, '');
      testUrl = testUrl.replace(/\/api\/v1\/?$/, '');
      testUrl = testUrl.replace(/\/workflow\/[^/]+.*$/, '');

      try {
        const url = new URL(testUrl);
        testUrl = `${url.protocol}//${url.host}`;
      } catch {
        Alert.alert('URL Inválida', 'La URL no es válida');
        setTesting(false);
        return;
      }

      const apiUrl = `${testUrl}/api/v1/workflows`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey.trim(),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const workflowCount = data.data?.length || data.length || 0;
        Alert.alert(
          '✅ Conexión exitosa',
          `Se encontraron ${workflowCount} workflow(s).\n\nURL: ${testUrl}`
        );
      } else {
        const errorText = await response.text();
        Alert.alert(
          '❌ Error de conexión',
          `Status: ${response.status}\n${response.statusText}\n\n${errorText.substring(0, 200)}`
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Error de red',
        error instanceof Error ? error.message : 'No se pudo conectar al servidor'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim() || !apiKey.trim() || !name.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos (Nombre, URL, API Key)');
      return;
    }

    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(serverUrl.trim())) {
      Alert.alert(
        'URL Inválida',
        'La URL debe comenzar con http:// o https://'
      );
      return;
    }

    setLoading(true);

    try {
      let cleanUrl = serverUrl.trim();
      cleanUrl = cleanUrl.replace(/\/$/, '');
      cleanUrl = cleanUrl.replace(/\/api\/v1\/?$/, '');
      cleanUrl = cleanUrl.replace(/\/workflow\/[^/]+.*$/, '');

      try {
        const url = new URL(cleanUrl);
        cleanUrl = `${url.protocol}//${url.host}`;
      } catch {
        Alert.alert('URL Inválida', 'No se pudo procesar la URL.');
        setLoading(false);
        return;
      }

      await saveServer({
        id: editingId || undefined,
        name: name.trim(),
        serverUrl: cleanUrl,
        apiKey: apiKey.trim(),
      });

      await loadData();
      resetForm();
      Alert.alert('Guardado', 'Servidor guardado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.loadingText}>Cargando servidores...</Text>
      </View>
    );
  }

  const renderServerItem = ({ item }: { item: N8nServer }) => {
      const isActive = item.id === activeId;
      const isEditing = item.id === editingId;

      return (
          <TouchableOpacity 
            style={[styles.serverCard, isEditing && styles.serverCardEditing]}
            onPress={() => handleSelectServer(item)}
            activeOpacity={0.7}
          >
              <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>{item.name}</Text>
                  <Text style={styles.serverUrl} numberOfLines={1}>{item.serverUrl}</Text>
              </View>
              
              <View style={styles.serverActions}>
                  {isActive ? (
                      <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVO</Text>
                      </View>
                  ) : (
                      <TouchableOpacity 
                        style={styles.activateButton}
                        onPress={() => handleActivate(item.id)}
                      >
                          <Text style={styles.activateButtonText}>Activar</Text>
                      </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                      <Ionicons name="trash-outline" size={20} color={THEME.textSecondary} />
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Servidores</Text>
            <Text style={styles.subtitle}>Gestiona tus conexiones n8n</Text>
        </View>
        <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
        >
            <Ionicons name="close" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
            data={servers}
            renderItem={renderServerItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <Text style={styles.emptyText}>No hay servidores configurados.</Text>
            }
        />
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
                {editingId ? 'Editar Servidor' : 'Agregar Nuevo Servidor'}
            </Text>
            {editingId && (
                <TouchableOpacity onPress={resetForm}>
                    <Text style={styles.resetText}>Cancelar Edición</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
            style={styles.input}
            placeholder="Mi Servidor n8n"
            placeholderTextColor={THEME.textSecondary}
            value={name}
            onChangeText={setName}
            editable={!loading}
            />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>URL del Servidor</Text>
            <TextInput
            style={styles.input}
            placeholder="https://n8n.example.com"
            placeholderTextColor={THEME.textSecondary}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!loading}
            />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
            style={styles.input}
            placeholder="n8n_api_xxxxxxxxxxxxx"
            placeholderTextColor={THEME.textSecondary}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!loading}
            />
        </View>

        <View style={styles.actionsContainer}>
            <TouchableOpacity
            style={[styles.testButton, testing && styles.buttonDisabled]}
            onPress={testConnection}
            disabled={testing || loading}
            >
            {testing ? (
                <ActivityIndicator color={THEME.accent} />
            ) : (
                <Text style={styles.testButtonText}>Probar Conexión</Text>
            )}
            </TouchableOpacity>

            <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading || testing}
            >
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <Text style={styles.buttonText}>{editingId ? 'Actualizar' : 'Guardar'}</Text>
            )}
            </TouchableOpacity>
        </View>

        {/* Debug/Reset Onboarding */}
        <TouchableOpacity 
            style={styles.introButton}
            onPress={async () => {
                const { resetOnboarding } = require('@/services/storage');
                await resetOnboarding();
                router.replace('/onboarding');
            }}
        >
            <Text style={styles.introButtonText}>Ver Intro de Nuevo</Text>
        </TouchableOpacity>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: THEME.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceHighlight,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    backgroundColor: THEME.surfaceHighlight,
    borderRadius: 20,
  },
  listContainer: {
      maxHeight: 220, // Limit height of server list
      borderBottomWidth: 1,
      borderBottomColor: THEME.surfaceHighlight,
  },
  listContent: {
      padding: 16,
  },
  emptyText: {
      color: THEME.textSecondary,
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
  },
  serverCard: {
      backgroundColor: THEME.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
  },
  serverCardEditing: {
      borderColor: THEME.accent,
      backgroundColor: 'rgba(234, 75, 113, 0.1)',
  },
  serverInfo: {
      flex: 1,
  },
  serverName: {
      color: THEME.textPrimary,
      fontWeight: 'bold',
      fontSize: 16,
  },
  serverUrl: {
      color: THEME.textSecondary,
      fontSize: 12,
      marginTop: 2,
  },
  serverActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  activeBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
  },
  activeBadgeText: {
      color: THEME.success,
      fontSize: 10,
      fontWeight: 'bold',
  },
  activateButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: THEME.surfaceHighlight,
      borderRadius: 12,
  },
  activateButtonText: {
      color: THEME.textPrimary,
      fontSize: 12,
      fontWeight: '600',
  },
  deleteButton: {
      padding: 8,
  },
  formContainer: {
      flex: 1,
  },
  formContent: {
      padding: 24,
      paddingBottom: 40,
  },
  formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
  },
  formTitle: {
      color: THEME.accent,
      fontSize: 18,
      fontWeight: 'bold',
  },
  resetText: {
      color: THEME.textSecondary,
      fontSize: 14,
      textDecorationLine: 'underline',
  },
  inputContainer: {
      marginBottom: 16,
      gap: 8,
  },
  label: {
      color: THEME.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  input: {
      backgroundColor: THEME.surface,
      borderRadius: 8,
      padding: 16,
      color: THEME.textPrimary,
      fontSize: 16,
  },
  actionsContainer: {
      gap: 16,
      marginTop: 24,
  },
  testButton: {
      borderWidth: 1,
      borderColor: THEME.textSecondary,
      borderRadius: 30,
      padding: 16,
      alignItems: 'center',
  },
  testButtonText: {
      color: THEME.textPrimary,
      fontWeight: '600',
      fontSize: 14,
  },
  button: {
      backgroundColor: THEME.accent,
      borderRadius: 30,
      padding: 16,
      alignItems: 'center',
  },
  buttonDisabled: {
      opacity: 0.6,
  },
  buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
  },
  loadingText: {
      marginTop: 16,
      color: THEME.textSecondary,
  },
  introButton: {
      marginTop: 40,
      alignItems: 'center',
      padding: 16,
  },
  introButtonText: {
      color: THEME.textSecondary,
      textDecorationLine: 'underline',
      fontSize: 14,
  },
});
