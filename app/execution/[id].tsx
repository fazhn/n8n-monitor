import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getExecution } from '@/services/n8n-api';

// Spotify-inspired Theme Constants
const THEME = {
  background: '#121212',
  surface: '#181818',
  surfaceHighlight: '#282828',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  accent: '#EA4B71', // n8n Primary
  success: '#22c55e', // Green for success
  error: '#FF5252',
};

export default function ExecutionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => getExecution(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.loadingText}>Cargando ejecución...</Text>
      </View>
    );
  }

  if (error || !execution) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color={THEME.error} />
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'No se pudo cargar la ejecución'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasError = execution.status === 'error';
  const errorInfo = execution.data?.resultData?.error;

  const getStatusIconName = () => {
    switch (execution.status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'waiting':
        return 'time';
      default:
        return 'ellipse';
    }
  };

  const getStatusColor = () => {
    switch (execution.status) {
      case 'success':
        return THEME.success;
      case 'error':
        return THEME.error;
      case 'waiting':
        return '#f59e0b';
      default:
        return THEME.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[
          hasError
            ? 'rgba(255, 82, 82, 0.4)'
            : execution.status === 'success'
            ? 'rgba(34, 197, 94, 0.4)'
            : 'rgba(234, 75, 113, 0.4)',
          THEME.background,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={styles.headerGradient}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Ionicons name={getStatusIconName()} size={48} color={getStatusColor()} />
          <Text style={styles.screenTitle}>
            {execution.status === 'success'
              ? 'Ejecución Exitosa'
              : hasError
              ? 'Error en Ejecución'
              : 'Ejecución en curso'}
          </Text>
          <Text style={styles.subTitle}>
            {format(new Date(execution.startedAt), "d 'de' MMMM, HH:mm:ss", { locale: es })}
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionHeader}>DETALLES</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {execution.id}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Workflow</Text>
            <Text style={styles.infoValue}>{execution.workflowData?.name || 'Descconocido'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modo</Text>
            <Text style={styles.infoValue}>
              {execution.mode === 'manual' ? 'Manual' : 'Automático'}
            </Text>
          </View>
          {execution.stoppedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fin</Text>
              <Text style={styles.infoValue}>
                {format(new Date(execution.stoppedAt), 'HH:mm:ss', { locale: es })}
              </Text>
            </View>
          )}
        </View>

        {/* Error Section */}
        {hasError && (
          <View style={[styles.cardContainer, styles.errorCard]}>
            <Text style={[styles.sectionHeader, { color: THEME.error }]}>ERROR</Text>
            <View style={styles.errorContent}>
              {errorInfo?.node && (
                <View style={styles.errorBlock}>
                  <Text style={styles.errorLabel}>Nodo</Text>
                  <Text style={styles.errorValue}>
                    {errorInfo.node.name} ({errorInfo.node.type})
                  </Text>
                </View>
              )}
              {errorInfo?.message && (
                <View style={styles.errorBlock}>
                  <Text style={styles.errorLabel}>Mensaje</Text>
                  <Text style={styles.errorMessage}>{errorInfo.message}</Text>
                </View>
              )}
              {errorInfo?.stack && (
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText}>
                    {errorInfo.stack.split('\n').slice(0, 3).join('\n')}...
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Flow Section */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionHeader}>FLUJO</Text>

          {execution.data?.resultData?.runData &&
            Object.entries(execution.data.resultData.runData).map(([nodeName, nodeData], index) => (
              <View key={nodeName} style={styles.flowItem}>
                <View style={styles.timelineContainer}>
                  <View style={[styles.timelineDot, { backgroundColor: THEME.success }]} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.flowContent}>
                  <Text style={styles.flowNodeName}>{nodeName}</Text>
                  <Text style={styles.flowMeta}>Procesado correctamente</Text>
                </View>
              </View>
            ))}

          {hasError && errorInfo?.node && (
            <View style={styles.flowItem}>
              <View style={styles.timelineContainer}>
                <View style={[styles.timelineDot, { backgroundColor: THEME.error }]} />
              </View>
              <View style={styles.flowContent}>
                <Text style={[styles.flowNodeName, { color: THEME.error }]}>
                  {errorInfo.node.name}
                </Text>
                <Text style={styles.flowMeta}>Fallo en la ejecución</Text>
              </View>
            </View>
          )}

          {!execution.data?.resultData?.runData && !hasError && (
            <Text style={styles.emptyText}>No hay datos de flujo disponibles.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: THEME.textPrimary,
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  cardContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.error,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.textSecondary,
    marginBottom: 16,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  infoLabel: {
    color: THEME.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorContent: {
    gap: 12,
  },
  errorBlock: {
    marginBottom: 8,
  },
  errorLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  errorValue: {
    color: THEME.textPrimary,
    fontWeight: '600',
  },
  errorMessage: {
    color: THEME.error,
    fontWeight: '500',
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  codeText: {
    fontFamily: 'Courier', // or monospace
    color: THEME.textSecondary,
    fontSize: 12,
  },
  flowItem: {
    flexDirection: 'row',
    minHeight: 40,
  },
  timelineContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  flowContent: {
    flex: 1,
    paddingBottom: 24,
  },
  flowNodeName: {
    color: THEME.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  flowMeta: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
  loadingText: {
    color: THEME.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    color: THEME.error,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    color: THEME.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: THEME.surfaceHighlight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: THEME.textPrimary,
    fontWeight: '600',
  },
});
