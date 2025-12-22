import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  activateWorkflow,
  deactivateWorkflow,
  getExecutions,
  getWorkflow,
} from '@/services/n8n-api';
import { N8nExecution } from '@/types/n8n';

// Spotify-inspired Theme Constants (Shared)
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

export default function WorkflowDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: workflow,
    isLoading: workflowLoading,
    error: workflowError,
    refetch: refetchWorkflow,
  } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflow(id!),
    enabled: !!id,
  });

  const {
    data: executions,
    isLoading: executionsLoading,
    refetch: refetchExecutions,
    isRefetching,
  } = useQuery({
    queryKey: ['executions', id],
    queryFn: () => getExecutions(id),
    enabled: !!id,
  });

  const successCount = executions?.filter(e => e.status === 'success').length || 0;
  const errorCount = executions?.filter(e => e.status === 'error').length || 0;

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) =>
      active ? deactivateWorkflow(id!) : activateWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      refetchWorkflow();
    },
    onError: (error) => {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo cambiar el estado'
      );
    },
  });

  const handleToggleActive = () => {
    if (!workflow) return;

    // Direct toggle without alert if activating? Or keep safety?
    // Keep safety for critical actions but maybe make it smoother.
    // For now keeping the alert but we could make a custom modal later.
    Alert.alert(
      workflow.active ? 'Pausar flujo' : 'Activar flujo',
      `¿Quieres ${workflow.active ? 'pausar' : 'activar'} "${workflow.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: workflow.active ? 'Pausar' : 'Activar',
          style: workflow.active ? 'destructive' : 'default',
          onPress: () => toggleMutation.mutate(workflow.active),
        },
      ]
    );
  };

  if (workflowLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  if (workflowError || !workflow) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color={THEME.error} />
        <Text style={styles.errorText}>No se pudo cargar el flujo</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetchWorkflow()}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderExecution = (execution: N8nExecution) => {
    const executionDate = format(
      new Date(execution.startedAt),
      "d MMM, HH:mm",
      { locale: es }
    );

    const duration = execution.stoppedAt
      ? formatDistanceToNow(new Date(execution.stoppedAt), {
          locale: es,
          addSuffix: false, // "5 minutos" instead of "hace 5 minutos"
        })
      : 'En curso';

    const isSuccess = execution.status === 'success';
    const isError = execution.status === 'error';
    
    let iconName: keyof typeof Ionicons.glyphMap = "time-outline";
    let statusColor = THEME.textSecondary;

    if (isSuccess) {
        iconName = "checkmark-circle";
        statusColor = THEME.success;
    } else if (isError) {
        iconName = "close-circle";
        statusColor = THEME.error;
    }

    return (
      <TouchableOpacity
        key={execution.id}
        style={styles.executionRow}
        onPress={() => router.push(`/execution/${execution.id}`)}
        activeOpacity={0.6}
      >
        <Ionicons name={iconName} size={24} color={statusColor} style={styles.executionIcon} />
        <View style={styles.executionInfo}>
            <Text style={styles.executionTitle}>
                {isSuccess ? 'Ejecución exitosa' : isError ? 'Falló la ejecución' : 'En ejecución'}
            </Text>
            <Text style={styles.executionDate}>{executionDate} • {duration}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={THEME.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Header Background */}
      <LinearGradient
        colors={[workflow.active ? 'rgba(234, 75, 113, 0.6)' : 'rgba(100,100,100, 0.4)', '#121212']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <View style={styles.headerToolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{workflow.name}</Text>
          <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchWorkflow();
              refetchExecutions();
            }}
            tintColor={THEME.accent}
            colors={[THEME.accent]}
            progressViewOffset={20}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
            <View style={styles.artworkPlaceholder}>
                <Ionicons name="git-network-outline" size={64} color="#FFF" />
            </View>
            <Text style={styles.workflowName}>{workflow.name}</Text>
            <View style={styles.metaRow}>
                <View style={[styles.statusTag, workflow.active ? styles.tagActive : styles.tagInactive]}>
                    <Text style={styles.statusTagText}>{workflow.active ? 'ACTIVO' : 'PAUSADO'}</Text>
                </View>
                <Text style={styles.updatedText}>
                    Actualizado {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true, locale: es })}
                </Text>
            </View>

            {/* Tags */}
             {workflow.tags && workflow.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                {workflow.tags.map((tag) => (
                    <View key={tag.id} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                    </View>
                ))}
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <View style={styles.actionButtonContainer}>
                    <TouchableOpacity 
                        style={[styles.playButton, !workflow.active && styles.playButtonInactive]}
                        onPress={handleToggleActive}
                        disabled={toggleMutation.isPending}
                    >
                        {toggleMutation.isPending ? (
                            <ActivityIndicator color={workflow.active ? "#000" : "#FFF"} />
                        ) : (
                            <Ionicons 
                                name={workflow.active ? "pause" : "play"} 
                                size={32} 
                                color={workflow.active ? "#000" : "#000"} 
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            {/* Simple Stats Row */}
            <View style={styles.statsContainer}>
               <View style={styles.statItem}>
                   <Text style={[styles.statValue, { color: THEME.success }]}>{successCount}</Text>
                   <Text style={styles.statLabel}>Exitosas</Text>
               </View>
               <View style={styles.statDivider} />
               <View style={styles.statItem}>
                   <Text style={[styles.statValue, { color: THEME.error }]}>{errorCount}</Text>
                   <Text style={styles.statLabel}>Errores</Text>
               </View>
            </View>
        </View>

        {/* Executions List */}
        <View style={styles.executionsSection}>
          <Text style={styles.sectionTitle}>Historial de Ejecuciones</Text>

          {executionsLoading ? (
            <ActivityIndicator size="small" color={THEME.accent} style={{ marginTop: 20 }} />
          ) : executions && executions.length > 0 ? (
            <View style={styles.executionsList}>
              {executions.slice(0, 20).map(renderExecution)}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay ejecuciones recientes.</Text>
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
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
      padding: 4,
  },
  headerTitle: {
      color: THEME.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      opacity: 0, // Hidden initially, could animate in on scroll
  },
  content: {
    flex: 1,
  },
  scrollContent: {
      paddingBottom: 40,
  },
  heroSection: {
      alignItems: 'center',
      paddingTop: 20,
      paddingHorizontal: 24,
      marginBottom: 32,
  },
  artworkPlaceholder: {
      width: 180,
      height: 180,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 12,
      },
      shadowOpacity: 0.58,
      shadowRadius: 16.00,
      elevation: 24,
      marginBottom: 24,
  },
  workflowName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
  },
  statusTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
  },
  tagActive: {
      backgroundColor: THEME.accent,
  },
  tagInactive: {
      backgroundColor: THEME.surfaceHighlight,
  },
  statusTagText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#000',
      letterSpacing: 0.5,
  },
  updatedText: {
      color: THEME.textSecondary,
      fontSize: 13,
  },
  tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
  },
  tagPill: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
  },
  tagText: {
      color: THEME.textPrimary,
      fontSize: 12,
  },
  actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
  },
  actionButtonContainer: {
      // Container for the big play button
  },
  playButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: THEME.success, // Changed to Green
      justifyContent: 'center',
      alignItems: 'center',
  },
  playButtonInactive: {
      backgroundColor: '#FFFFFF', // White when inactive (play action)? Or maybe Grey? Spotify uses Green always for the main action usually.
      // Left as green for consistency, but maybe White for "Start".
  },
  statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
  },
  statItem: {
      alignItems: 'center',
      paddingHorizontal: 16,
  },
  statDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 2,
  },
  statLabel: {
      fontSize: 12,
      color: THEME.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  executionsSection: {
      paddingHorizontal: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: THEME.textPrimary,
      marginBottom: 16,
  },
  executionsList: {
      gap: 0, // List items usually flush or small gap
  },
  executionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  executionIcon: {
      marginRight: 16,
  },
  executionInfo: {
      flex: 1,
  },
  executionTitle: {
      color: THEME.textPrimary,
      fontSize: 15,
      fontWeight: '500',
      marginBottom: 4,
  },
  executionDate: {
      color: THEME.textSecondary,
      fontSize: 13,
  },
  emptyText: {
      color: THEME.textSecondary,
      textAlign: 'center',
      marginTop: 20,
  },
  errorText: {
    color: THEME.textPrimary,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
      padding: 12,
      backgroundColor: THEME.surfaceHighlight,
      borderRadius: 8,
  },
  retryButtonText: {
      color: THEME.textPrimary,
  }
});
