import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { getWorkflows } from '@/services/n8n-api';
import { hasN8nConfig, isOnboardingCompleted } from '@/services/storage';
import { N8nWorkflow } from '@/types/n8n';

// Spotify-inspired Theme Constants
const THEME = {
  background: '#121212',
  surface: '#181818',
  surfaceHighlight: '#282828',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  accent: '#EA4B71', // n8n Primary
  success: '#22c55e', // Green
  error: '#FF5252',
};

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: workflows,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: getWorkflows,
    enabled: !checking,
  });

  useEffect(() => {
    checkConfig();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!checking) {
        refetch();
      }
    }, [checking, refetch])
  );

  const checkConfig = async () => {
    try {
      // 1. Check Onboarding
      const onboardingDone = await isOnboardingCompleted();
      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }

      // 2. Check Config
      const configExists = await hasN8nConfig();
      if (!configExists) {
        router.replace('/setup');
      } else {
        setChecking(false);
      }
    } catch {
      router.replace('/setup');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const filteredWorkflows = workflows?.filter(workflow => {
    // Filter by Status
    if (filter === 'active' && !workflow.active) return false;
    if (filter === 'inactive' && workflow.active) return false;

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return workflow.name.toLowerCase().includes(query);
    }

    return true;
  });

  if (checking || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.loadingText}>Cargando flujos de trabajo...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color={THEME.error} />
        <Text style={styles.errorTitle}>Algo salió mal</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Error de conexión'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/setup')}>
          <Text style={styles.settingsLinkText}>Revisar configuración</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeCount = workflows?.filter(w => w.active).length || 0;
  const inactiveCount = workflows?.filter(w => !w.active).length || 0;
  const totalCount = workflows?.length || 0;

  const renderWorkflow = ({ item, index }: { item: N8nWorkflow; index: number }) => {
    const lastUpdate = formatDistanceToNow(new Date(item.updatedAt), {
      addSuffix: true,
      locale: es,
    });

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
        <TouchableOpacity
          style={styles.workflowCard}
          onPress={() => router.push(`/workflow/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View
              style={[styles.iconContainer, item.active ? styles.iconActive : styles.iconInactive]}
            >
              <Ionicons
                name="git-network-outline"
                size={24}
                color={item.active ? THEME.textPrimary : THEME.textSecondary}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.workflowName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.metaBadgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    item.active ? styles.badgeActive : styles.badgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.active ? { color: THEME.success } : { color: THEME.textSecondary },
                    ]}
                  >
                    {item.active ? 'ACTIVO' : 'INACTIVO'}
                  </Text>
                </View>
                <Text style={styles.workflowMeta}>{lastUpdate}</Text>
              </View>
            </View>
            <Ionicons
              name={item.active ? 'play-circle' : 'pause-circle'} // Status indicator
              size={32}
              color={item.active ? THEME.success : THEME.surfaceHighlight}
            />
          </View>

          {/* Visual Flow Line (Decoration) */}
          <View style={styles.flowLineContainer}>
            <View
              style={[
                styles.flowDot,
                item.active
                  ? { backgroundColor: THEME.success }
                  : { backgroundColor: THEME.surfaceHighlight },
              ]}
            />
            <View style={styles.flowLine} />
            <View style={styles.flowDotEnd} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(234, 75, 113, 0.3)', '#121212']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.subtitle}>Resumen de flujos</Text>
        </View>
      </View>

      {/* Stats Dashboard */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: THEME.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: THEME.textSecondary }]}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Inactivos</Text>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={THEME.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar flujos..."
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Flujos</Text>
      </View>

      <View style={styles.filterContainer}>
        <Pressable
          onPress={() => setFilter('all')}
          style={filter === 'all' ? styles.filterChipActive : styles.filterChip}
        >
          <Text style={filter === 'all' ? styles.filterTextActive : styles.filterText}>Todos</Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter('active')}
          style={filter === 'active' ? styles.filterChipActive : styles.filterChip}
        >
          <Text style={filter === 'active' ? styles.filterTextActive : styles.filterText}>
            Activos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter('inactive')}
          style={filter === 'inactive' ? styles.filterChipActive : styles.filterChip}
        >
          <Text style={filter === 'inactive' ? styles.filterTextActive : styles.filterText}>
            Inactivos
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredWorkflows}
        renderItem={renderWorkflow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={THEME.accent}
            colors={[THEME.accent]}
            progressViewOffset={40}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <>
                <Ionicons name="search-outline" size={48} color={THEME.textSecondary} />
                <Text style={styles.emptyText}>No encontrado</Text>
                <Text style={styles.emptySubtext}>INTENTA CON OTRO TÉRMINO</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No hay flujos de trabajo</Text>
                <Text style={styles.emptySubtext}>Tus flujos de n8n aparecerán aquí.</Text>
              </>
            )}
          </View>
        }
      />

      {/* Floating Menu */}
      <View style={styles.floatingMenuContainer}>
        <BlurView intensity={80} tint="dark" style={styles.floatingMenu}>
          <Animated.View entering={FadeInUp.delay(500)}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setFilter('all')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, filter === 'all' && styles.menuIconActive]}>
                <Ionicons
                  name={filter === 'all' ? 'home' : 'home-outline'}
                  size={22}
                  color={filter === 'all' ? '#000' : '#FFF'}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600)}>
            <TouchableOpacity style={styles.menuItem} onPress={() => refetch()} activeOpacity={0.7}>
              <View style={[styles.menuIconContainer, isRefetching && styles.menuIconActive]}>
                <Ionicons name="refresh" size={22} color={isRefetching ? '#000' : '#FFF'} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(700)}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push({ pathname: '/setup', params: { action: 'add' } })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="add-circle-outline" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800)}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/setup')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="server-outline" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  gradientHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  // Search Styles
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  // Stats Styles
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // List Styles
  listContent: {
    paddingBottom: 120,
    paddingTop: 8,
    paddingHorizontal: 16, // Added horizontal padding for cards
  },
  workflowCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Green tint
  },
  iconInactive: {
    backgroundColor: THEME.surfaceHighlight,
  },
  cardInfo: {
    flex: 1,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  workflowMeta: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  // Flow Decoration
  flowLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20, // Align with icon center roughly
    opacity: 0.5,
  },
  flowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  flowLine: {
    flex: 1,
    height: 2,
    backgroundColor: THEME.surfaceHighlight,
    borderRadius: 1,
    marginRight: 4,
  },
  flowDotEnd: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.surfaceHighlight,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: THEME.textPrimary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  settingsLink: {
    padding: 8,
  },
  settingsLinkText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    textTransform: 'uppercase', // Style adjust for "search not found"
    letterSpacing: 1,
  },
  // Floating Menu Styles
  floatingMenuContainer: {
    position: 'absolute',
    bottom: 24, // Moved down from 40
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  floatingMenu: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 30, 30, 0.4)', // Reduced opacity for stronger blur effect
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 32,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Required for BlurView borderRadius
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuIconActive: {
    backgroundColor: THEME.accent,
  },
});
