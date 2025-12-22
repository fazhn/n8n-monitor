import {
    getActiveServerId,
    getServers,
    removeServer,
    saveServer,
    setActiveServerId
} from '@/services/storage';
import { N8nServer } from '@/types/n8n';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
    View
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

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
  const params = useLocalSearchParams<{ action?: string }>();
  
  // UI Mode
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    if (params.action === 'add') {
        // We can't call handleAddNew directly here because it might depend on other state/functions not yet declared if using closures, 
        // but function hoisting usually works. However, to be safe and clean:
        setEditingId(null);
        setName('');
        setServerUrl('');
        setApiKey('');
        setViewMode('form');
    }
  }, [params.action]);

  const loadData = async () => {
    try {
      setLoadingConfig(true);
      const serverList = await getServers();
      const currentActive = await getActiveServerId();
      
      setServers(serverList);
      setActiveId(currentActive || (serverList.length > 0 ? serverList[0].id : null));
      
      // If no servers, go to form automatically? Optional, but let's stick to list for consistency
      // unless completely empty and first run?
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Filter Servers
  const filteredServers = servers.filter(
      server => 
          server.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          server.serverUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
      resetForm();
      setViewMode('form');
  };

  const handleEdit = (server: N8nServer) => {
      setEditingId(server.id);
      setName(server.name);
      setServerUrl(server.serverUrl);
      setApiKey(server.apiKey);
      setViewMode('form');
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
                      if (editingId === id) {
                          resetForm();
                          setViewMode('list');
                      }
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

  const goBackToList = () => {
      resetForm();
      setViewMode('list');
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
      setViewMode('list'); // Go back to list after saving
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

  const renderServerItem = ({ item, index }: { item: N8nServer; index: number }) => {
      const isActive = item.id === activeId;
      
      return (
          <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
          <TouchableOpacity 
            style={[styles.serverCard, isActive && styles.serverCardActive]}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
          >
              <View style={styles.serverCardInner}>
                {/* Icon Column */}
                <View style={[styles.serverIconContainer, isActive ? styles.serverIconActive : styles.serverIconInactive]}>
                    <Ionicons 
                        name={isActive ? "cloud-done" : "cloud-outline"} 
                        size={24} 
                        color={isActive ? THEME.success : THEME.textSecondary} 
                    />
                </View>

                {/* Info Column */}
                <View style={styles.serverInfo}>
                    <Text style={[styles.serverName, isActive && { color: THEME.success }]}>
                        {item.name}
                    </Text>
                    <Text style={styles.serverUrl} numberOfLines={1}>
                        {item.serverUrl.replace(/^https?:\/\//, '')}
                    </Text>
                </View>

                {/* Action Column */}
                <View style={styles.serverActions}>
                    {isActive ? (
                        <View style={styles.statusBadge}>
                             <View style={styles.liveDot} />
                             <Text style={styles.statusText}>EN LÍNEA</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.connectButton}
                            onPress={() => handleActivate(item.id)}
                        >
                            <Text style={styles.connectButtonText}>Conectar</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>

              {/* Footer Actions (Edit/Delete hint) */}
              <View style={styles.cardFooter}>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.footerAction}>
                      <Ionicons name="trash-outline" size={16} color={THEME.error} />
                      <Text style={[styles.footerActionText, { color: THEME.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.footerAction}>
                      <Text style={styles.footerActionText}>Editar</Text>
                      <Ionicons name="chevron-forward" size={14} color={THEME.textSecondary} />
                  </View>
              </View>
          </TouchableOpacity>
          </Animated.View>
      );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.headerRow}>
        {viewMode === 'form' ? (
             <TouchableOpacity style={styles.closeButton} onPress={goBackToList}>
                <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
            </TouchableOpacity>
        ) : (
            <View /> // Spacer if no back button
        )}

        <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
                {viewMode === 'list' ? 'Servidores' : (editingId ? 'Editar Servidor' : 'Nuevo Servidor')}
            </Text>
            {viewMode === 'list' && (
                <Text style={styles.subtitle}>Gestiona tus conexiones n8n</Text>
            )}
        </View>
        
        <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
        >
            <Ionicons name="close" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {viewMode === 'list' ? (
          <View style={styles.listContainer}>
             {/* Search Bar */}
             <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={THEME.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar servidores..."
                        placeholderTextColor={THEME.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={THEME.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
             </Animated.View>

            <FlatList
                data={filteredServers}
                renderItem={renderServerItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        {searchQuery ? (
                             <>
                                <Ionicons name="search-outline" size={64} color={THEME.surfaceHighlight} />
                                <Text style={styles.emptyText}>No encontrado</Text>
                             </>
                        ): (
                            <>
                                <Ionicons name="server-outline" size={64} color={THEME.surfaceHighlight} />
                                <Text style={styles.emptyText}>No hay servidores configurados.</Text>
                                <Text style={[styles.emptyText, { fontSize: 13, marginTop: 8 }]}>Agrega uno para comenzar.</Text>
                            </>
                        )}
                    </View>
                }
                ListFooterComponent={
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
                }
            />
            {/* FAB */}
            <Animated.View entering={ZoomIn.delay(500).springify()} style={{ position: 'absolute', bottom: 40, right: 24 }}>
            <TouchableOpacity 
                style={styles.fabStatic} // Was separate absolute, typically better to wrap absolute view
                onPress={handleAddNew}
            >
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            </Animated.View>
          </View>
      ) : (
          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
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
          </ScrollView>
      )}

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
    alignItems: 'center', // Centered vertically
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: THEME.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceHighlight,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surfaceHighlight,
    borderRadius: 20,
  },
  // Search Styles
  searchContainer: {
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 48,
  },
  searchIcon: {
      marginRight: 8,
  },
  searchInput: {
      flex: 1,
      color: THEME.textPrimary,
      fontSize: 16,
      height: '100%',
  },
  listContainer: {
      flex: 1,
  },
  listContent: {
      padding: 16,
      paddingBottom: 100, // Space for FAB
  },
  emptyText: {
      color: THEME.textSecondary,
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
      fontSize: 16,
  },
  serverCard: {
      backgroundColor: THEME.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      overflow: 'hidden',
  },
  serverCardActive: {
      borderColor: 'rgba(34, 197, 94, 0.4)',
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  serverCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
  },
  serverIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 1,
  },
  serverIconActive: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  serverIconInactive: {
      backgroundColor: THEME.surfaceHighlight,
      borderColor: 'transparent',
  },
  serverInfo: {
      flex: 1,
      gap: 4,
  },
  serverName: {
      color: THEME.textPrimary,
      fontWeight: 'bold',
      fontSize: 16,
  },
  serverUrl: {
      color: THEME.textSecondary,
      fontSize: 12,
  },
  serverActions: {
      justifyContent: 'center',
  },
  connectButton: {
      backgroundColor: THEME.surfaceHighlight,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  connectButtonText: {
      color: THEME.textPrimary,
      fontSize: 12,
      fontWeight: '600',
  },
  statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: THEME.success,
      marginRight: 6,
  },
  statusText: {
      color: THEME.success,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 0.5,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  footerActionText: {
      fontSize: 12,
      color: THEME.textSecondary,
  },
  fab: {
      position: 'absolute',
      bottom: 40,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: THEME.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
  },
  fabStatic: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: THEME.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
  },
  formContainer: {
      flex: 1,
  },
  formContent: {
      padding: 24,
      paddingBottom: 40,
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
