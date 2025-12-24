import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  activateWorkflow,
  deactivateWorkflow,
  getExecutions,
  getWorkflow,
  updateWorkflow,
} from '@/services/n8n-api';
import { N8nExecution } from '@/types/n8n';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'running'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });
  const ITEMS_PER_PAGE = 10;

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

  // Filter executions based on status and time
  const filteredExecutions =
    executions?.filter(e => {
      // Status filter
      if (statusFilter !== 'all' && e.status !== statusFilter) {
        return false;
      }

      // Time filter
      if (timeFilter !== 'all') {
        const executionDate = new Date(e.stoppedAt || e.startedAt);
        const now = new Date();

        switch (timeFilter) {
          case '24h':
            return executionDate >= subHours(now, 24);
          case '7d':
            return executionDate >= subDays(now, 7);
          case '30d':
            return executionDate >= subDays(now, 30);
        }
      }

      return true;
    }) || [];

  const successCount = executions?.filter(e => e.status === 'success').length || 0;
  const errorCount = executions?.filter(e => e.status === 'error').length || 0;
  const runningCount = executions?.filter(e => e.status === 'running').length || 0;

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => (active ? deactivateWorkflow(id!) : activateWorkflow(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      refetchWorkflow();
    },
    onError: error => {
      showAlert(t.error, error instanceof Error ? error.message : 'No se pudo cambiar el estado', 'error');
    },
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'confirm' = 'success',
    onConfirm?: () => void
  ) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string }) => {
      if (!workflow) throw new Error('Workflow not loaded');
      return updateWorkflow(id!, workflow, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      refetchWorkflow();
      setEditModalVisible(false);
      showAlert(t.save, t.workflowUpdated, 'success');
    },
    onError: error => {
      showAlert(t.error, error instanceof Error ? error.message : 'No se pudo actualizar el workflow', 'error');
    },
  });

  const handleToggleActive = () => {
    if (!workflow) return;

    showAlert(
      workflow.active ? 'Pausar flujo' : 'Activar flujo',
      `¿Quieres ${workflow.active ? 'pausar' : 'activar'} "${workflow.name}"?`,
      'confirm',
      () => toggleMutation.mutate(workflow.active)
    );
  };

  const handleOpenEditModal = () => {
    if (!workflow) return;
    setEditedName(workflow.name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      showAlert(t.error, 'El nombre no puede estar vacío', 'error');
      return;
    }
    updateMutation.mutate({ name: editedName.trim() });
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
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchWorkflow()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderExecution = (execution: N8nExecution) => {
    const executionDate = format(new Date(execution.startedAt), 'd MMM, HH:mm', { locale: es });

    const duration = execution.stoppedAt
      ? formatDistanceToNow(new Date(execution.stoppedAt), {
          locale: es,
          addSuffix: false, // "5 minutos" instead of "hace 5 minutos"
        })
      : 'En curso';

    const isSuccess = execution.status === 'success';
    const isError = execution.status === 'error';

    let iconName: keyof typeof Ionicons.glyphMap = 'time-outline';
    let statusColor = THEME.textSecondary;

    if (isSuccess) {
      iconName = 'checkmark-circle';
      statusColor = THEME.success;
    } else if (isError) {
      iconName = 'close-circle';
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
          <Text style={styles.executionDate}>
            {executionDate} • {duration}
          </Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {workflow.name}
        </Text>
        <TouchableOpacity onPress={handleOpenEditModal} style={styles.backButton}>
          <Ionicons name="create-outline" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
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
            <Ionicons name="git-network-outline" size={48} color="#FFF" />
          </View>
          <Text style={styles.workflowName}>{workflow.name}</Text>
          <View style={styles.metaRow}>
            <View
              style={[styles.statusTag, workflow.active ? styles.tagActive : styles.tagInactive]}
            >
              <Text style={styles.statusTagText}>{workflow.active ? 'ACTIVO' : 'PAUSADO'}</Text>
            </View>
            <Text style={styles.updatedText}>
              Actualizado{' '}
              {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true, locale: es })}
            </Text>
          </View>

          {/* Tags */}
          {workflow.tags && workflow.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {workflow.tags.map(tag => (
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
                style={[
                  styles.playButton,
                  !workflow.active && styles.playButtonInactive,
                  (workflow.nodes?.length || 0) === 0 && styles.playButtonDisabled,
                ]}
                onPress={handleToggleActive}
                disabled={toggleMutation.isPending || (workflow.nodes?.length || 0) === 0}
              >
                {toggleMutation.isPending ? (
                  <ActivityIndicator color={workflow.active ? '#000' : '#FFF'} />
                ) : (
                  <Ionicons
                    name={workflow.active ? 'pause' : 'play'}
                    size={32}
                    color={(workflow.nodes?.length || 0) === 0 ? THEME.textSecondary : '#000'}
                  />
                )}
              </TouchableOpacity>
              {(workflow.nodes?.length || 0) === 0 && (
                <Text style={styles.disabledText}>El workflow necesita al menos un nodo</Text>
              )}
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
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: THEME.textPrimary }]}>
                {workflow.nodes?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Nodos</Text>
            </View>
          </View>
        </View>

        {/* Executions List */}
        <View style={styles.executionsSection}>
          <Text style={styles.sectionTitle}>Historial de Ejecuciones</Text>

          {executionsLoading ? (
            <ActivityIndicator size="small" color={THEME.accent} style={{ marginTop: 20 }} />
          ) : executions && executions.length > 0 ? (
            <>
              {/* Filter Section with Header */}
              <View style={styles.filterSection}>
                {/* Filter Header with Results Counter */}
                <View style={styles.filterHeader}>
                  <View style={styles.filterTitleRow}>
                    <Ionicons name="filter" size={18} color={THEME.accent} />
                    <Text style={styles.filterTitle}>Filtros</Text>
                  </View>
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {filteredExecutions.length} resultado
                      {filteredExecutions.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Status Filter - Segmented Control Style */}
                <View style={styles.filterGroupContainer}>
                  <Text style={styles.filterGroupLabel}>
                    <Ionicons name="pulse-outline" size={14} color={THEME.textSecondary} /> Estado
                  </Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[
                        styles.segmentedButton,
                        styles.segmentedButtonFirst,
                        statusFilter === 'all' && styles.segmentedButtonActive,
                      ]}
                      onPress={() => {
                        setStatusFilter('all');
                        setCurrentPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentedButtonText,
                          statusFilter === 'all' && styles.segmentedButtonTextActive,
                        ]}
                      >
                        Todos
                      </Text>
                      <View
                        style={[
                          styles.segmentedBadge,
                          statusFilter === 'all' && styles.segmentedBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedBadgeText,
                            statusFilter === 'all' && styles.segmentedBadgeTextActive,
                          ]}
                        >
                          {executions?.length || 0}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentedButton,
                        statusFilter === 'success' && styles.segmentedButtonSuccess,
                      ]}
                      onPress={() => {
                        setStatusFilter('success');
                        setCurrentPage(1);
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={statusFilter === 'success' ? '#FFF' : THEME.success}
                      />
                      <Text
                        style={[
                          styles.segmentedButtonText,
                          statusFilter === 'success' && styles.segmentedButtonTextActive,
                        ]}
                      >
                        Éxito
                      </Text>
                      <View
                        style={[
                          styles.segmentedBadge,
                          {
                            backgroundColor:
                              statusFilter === 'success'
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(34,197,94,0.2)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedBadgeText,
                            { color: statusFilter === 'success' ? '#FFF' : THEME.success },
                          ]}
                        >
                          {successCount}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentedButton,
                        statusFilter === 'error' && styles.segmentedButtonError,
                      ]}
                      onPress={() => {
                        setStatusFilter('error');
                        setCurrentPage(1);
                      }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={statusFilter === 'error' ? '#FFF' : THEME.error}
                      />
                      <Text
                        style={[
                          styles.segmentedButtonText,
                          statusFilter === 'error' && styles.segmentedButtonTextActive,
                        ]}
                      >
                        Error
                      </Text>
                      <View
                        style={[
                          styles.segmentedBadge,
                          {
                            backgroundColor:
                              statusFilter === 'error'
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(255,82,82,0.2)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedBadgeText,
                            { color: statusFilter === 'error' ? '#FFF' : THEME.error },
                          ]}
                        >
                          {errorCount}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {runningCount > 0 && (
                      <TouchableOpacity
                        style={[
                          styles.segmentedButton,
                          styles.segmentedButtonLast,
                          statusFilter === 'running' && styles.segmentedButtonRunning,
                        ]}
                        onPress={() => {
                          setStatusFilter('running');
                          setCurrentPage(1);
                        }}
                      >
                        <Ionicons
                          name="hourglass-outline"
                          size={14}
                          color={statusFilter === 'running' ? '#FFF' : '#FFA500'}
                        />
                        <Text
                          style={[
                            styles.segmentedButtonText,
                            statusFilter === 'running' && styles.segmentedButtonTextActive,
                          ]}
                        >
                          Activo
                        </Text>
                        <View
                          style={[
                            styles.segmentedBadge,
                            {
                              backgroundColor:
                                statusFilter === 'running'
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'rgba(255,165,0,0.2)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentedBadgeText,
                              { color: statusFilter === 'running' ? '#FFF' : '#FFA500' },
                            ]}
                          >
                            {runningCount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Time Filter - Pill Style */}
                <View style={styles.filterGroupContainer}>
                  <Text style={styles.filterGroupLabel}>
                    <Ionicons name="time-outline" size={14} color={THEME.textSecondary} /> Período
                  </Text>
                  <View style={styles.timeFilterRow}>
                    <TouchableOpacity
                      style={[styles.timePill, timeFilter === 'all' && styles.timePillActive]}
                      onPress={() => {
                        setTimeFilter('all');
                        setCurrentPage(1);
                      }}
                    >
                      <Ionicons
                        name="infinite-outline"
                        size={16}
                        color={timeFilter === 'all' ? '#000' : THEME.textSecondary}
                      />
                      <Text
                        style={[
                          styles.timePillText,
                          timeFilter === 'all' && styles.timePillTextActive,
                        ]}
                      >
                        Todo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timePill, timeFilter === '24h' && styles.timePillActive]}
                      onPress={() => {
                        setTimeFilter('24h');
                        setCurrentPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePillText,
                          timeFilter === '24h' && styles.timePillTextActive,
                        ]}
                      >
                        24h
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timePill, timeFilter === '7d' && styles.timePillActive]}
                      onPress={() => {
                        setTimeFilter('7d');
                        setCurrentPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePillText,
                          timeFilter === '7d' && styles.timePillTextActive,
                        ]}
                      >
                        7 días
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timePill, timeFilter === '30d' && styles.timePillActive]}
                      onPress={() => {
                        setTimeFilter('30d');
                        setCurrentPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePillText,
                          timeFilter === '30d' && styles.timePillTextActive,
                        ]}
                      >
                        30 días
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {filteredExecutions.length > 0 ? (
                <>
                  <View style={styles.executionsList}>
                    {filteredExecutions
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map(renderExecution)}
                  </View>

                  {/* Pagination Controls */}
                  {filteredExecutions.length > ITEMS_PER_PAGE && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage === 1 ? THEME.textSecondary : THEME.textPrimary}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage === 1 && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Anterior
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.paginationInfo}>
                        <Text style={styles.paginationText}>
                          Página {currentPage} de{' '}
                          {Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage === Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE) &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() =>
                          setCurrentPage(prev =>
                            Math.min(
                              Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE),
                              prev + 1
                            )
                          )
                        }
                        disabled={
                          currentPage === Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE)
                        }
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage === Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE) &&
                              styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Siguiente
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage === Math.ceil(filteredExecutions.length / ITEMS_PER_PAGE)
                              ? THEME.textSecondary
                              : THEME.textPrimary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>
                  {statusFilter === 'all' && timeFilter === 'all'
                    ? 'No hay ejecuciones recientes.'
                    : 'No hay ejecuciones que coincidan con los filtros seleccionados.'}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No hay ejecuciones recientes.</Text>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.editWorkflow}</Text>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>{t.workflowName}</Text>
              <TextInput
                style={styles.modalInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder={t.workflowNamePlaceholder}
                placeholderTextColor={THEME.textSecondary}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave} numberOfLines={1}>
                    {t.saveChanges}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={[
            styles.alertContent,
            alertConfig.type === 'success' && styles.alertContentSuccess,
            alertConfig.type === 'error' && styles.alertContentError,
          ]}>
            {/* Icon */}
            <View style={[
              styles.alertIcon,
              alertConfig.type === 'success' && styles.alertIconSuccess,
              alertConfig.type === 'error' && styles.alertIconError,
              alertConfig.type === 'confirm' && styles.alertIconConfirm,
            ]}>
              <Ionicons
                name={
                  alertConfig.type === 'success' ? 'checkmark-circle' :
                  alertConfig.type === 'error' ? 'close-circle' :
                  'help-circle'
                }
                size={40}
                color="#FFF"
              />
            </View>

            {/* Title */}
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>

            {/* Message */}
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            {/* Buttons */}
            <View style={styles.alertButtons}>
              {alertConfig.type === 'confirm' ? (
                <>
                  <TouchableOpacity
                    style={[styles.alertButton, styles.alertButtonCancel]}
                    onPress={hideAlert}
                  >
                    <Text style={styles.alertButtonTextCancel}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.alertButton, styles.alertButtonConfirm]}
                    onPress={() => {
                      hideAlert();
                      alertConfig.onConfirm?.();
                    }}
                  >
                    <Text style={styles.alertButtonTextConfirm}>Confirmar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.alertButton,
                    styles.alertButtonSingle,
                    alertConfig.type === 'success' && styles.alertButtonSuccess,
                    alertConfig.type === 'error' && styles.alertButtonError,
                  ]}
                  onPress={hideAlert}
                >
                  <Text style={styles.alertButtonTextSingle}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
    height: 280,
  },
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
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
    paddingTop: 10,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  artworkPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.0,
    elevation: 24,
    marginBottom: 20,
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
    backgroundColor: THEME.success,
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
    alignItems: 'center',
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
  playButtonDisabled: {
    backgroundColor: THEME.surfaceHighlight,
    opacity: 0.5,
  },
  disabledText: {
    color: THEME.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: THEME.textSecondary,
  },
  paginationInfo: {
    paddingHorizontal: 16,
  },
  paginationText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  // New Filter Styles
  filterSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterBadge: {
    backgroundColor: 'rgba(234, 75, 113, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  filterGroupContainer: {
    marginBottom: 16,
  },
  filterGroupLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  segmentedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 0, // Default to no radius for middle items
  },
  segmentedButtonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentedButtonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentedButtonActive: {
    backgroundColor: THEME.surfaceHighlight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  segmentedButtonSuccess: {
    backgroundColor: THEME.success,
  },
  segmentedButtonError: {
    backgroundColor: THEME.error,
  },
  segmentedButtonRunning: {
    backgroundColor: '#FFA500',
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  segmentedButtonTextActive: {
    color: '#FFF',
  },
  segmentedBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  segmentedBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  segmentedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  segmentedBadgeTextActive: {
    color: '#FFF',
  },
  timeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timePillActive: {
    backgroundColor: THEME.textPrimary,
    borderColor: THEME.textPrimary,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  timePillTextActive: {
    color: '#000',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: THEME.surfaceHighlight,
    borderRadius: 8,
    padding: 16,
    color: THEME.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalButtonSave: {
    backgroundColor: THEME.accent,
  },
  modalButtonTextCancel: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  alertContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  alertContentSuccess: {
    borderColor: 'rgba(34,197,94,0.3)',
  },
  alertContentError: {
    borderColor: 'rgba(255,82,82,0.3)',
  },
  alertIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconSuccess: {
    backgroundColor: THEME.success,
  },
  alertIconError: {
    backgroundColor: THEME.error,
  },
  alertIconConfirm: {
    backgroundColor: THEME.accent,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  alertButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  alertButtonConfirm: {
    backgroundColor: THEME.accent,
  },
  alertButtonSingle: {
    flex: 1,
  },
  alertButtonSuccess: {
    backgroundColor: THEME.success,
  },
  alertButtonError: {
    backgroundColor: THEME.error,
  },
  alertButtonTextCancel: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  alertButtonTextConfirm: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  alertButtonTextSingle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
