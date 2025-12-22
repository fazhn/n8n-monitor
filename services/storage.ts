import { N8nConfig, N8nServer } from '@/types/n8n';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  SERVER_URL: 'n8n_server_url', // Legacy
  API_KEY: 'n8n_api_key',       // Legacy
  SERVERS: 'n8n_servers',       // New: Array of servers
  ACTIVE_SERVER_ID: 'n8n_active_server_id',
  ONBOARDING_COMPLETED: 'n8n_onboarding_completed',
} as const;

/**
 * Check if onboarding has been completed
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  const completed = await SecureStore.getItemAsync(STORAGE_KEYS.ONBOARDING_COMPLETED);
  return completed === 'true';
}

/**
 * Mark onboarding as completed
 */
export async function setOnboardingCompleted(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
}

/**
 * Reset onboarding status (for testing/re-viewing)
 */
export async function resetOnboarding(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.ONBOARDING_COMPLETED);
}

/**
 * Get all saved servers
 */
export async function getServers(): Promise<N8nServer[]> {
  try {
    const serversJson = await SecureStore.getItemAsync(STORAGE_KEYS.SERVERS);
    if (serversJson) {
      return JSON.parse(serversJson);
    }

    // Migration Check: If no servers list but legacy config exists
    const legacyUrl = await SecureStore.getItemAsync(STORAGE_KEYS.SERVER_URL);
    const legacyKey = await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);

    if (legacyUrl && legacyKey) {
      const newServer: N8nServer = {
        id: uuidv4(),
        name: 'My n8n Server',
        serverUrl: legacyUrl,
        apiKey: legacyKey,
      };
      await saveServerList([newServer]);
      await setActiveServerId(newServer.id);
      return [newServer];
    }

    return [];
  } catch (error) {
    console.error('Error getting servers:', error);
    return [];
  }
}

/**
 * Save the full list of servers
 */
async function saveServerList(servers: N8nServer[]): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
}

/**
 * Add or Update a server
 */
export async function saveServer(config: N8nConfig): Promise<void> {
  const servers = await getServers();
  
  if (config.id) {
    // Update existing
    const index = servers.findIndex(s => s.id === config.id);
    if (index !== -1) {
      servers[index] = { ...servers[index], ...config } as N8nServer;
    } else {
        // Fallback if ID provided but not found (shouldn't happen often)
        servers.push({ ...config, id: config.id, name: config.name || 'n8n Server' } as N8nServer);
    }
  } else {
    // Add new
    const newServer: N8nServer = {
      id: uuidv4(),
      name: config.name || 'New Server',
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
    };
    servers.push(newServer);
    
    // If it's the first server, make it active
    if (servers.length === 1) {
        await setActiveServerId(newServer.id);
    }
  }

  await saveServerList(servers);
}

/**
 * Remove a server by ID
 */
export async function removeServer(id: string): Promise<void> {
    const servers = await getServers();
    const newServers = servers.filter(s => s.id !== id);
    await saveServerList(newServers);

    // If we removed the active server, reset active ID
    const activeId = await getActiveServerId();
    if (activeId === id) {
        if (newServers.length > 0) {
            await setActiveServerId(newServers[0].id);
        } else {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_SERVER_ID);
        }
    }
}

/**
 * Set the active server ID
 */
export async function setActiveServerId(id: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_SERVER_ID, id);
}

/**
 * Get the active server ID
 */
export async function getActiveServerId(): Promise<string | null> {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_SERVER_ID);
}

/**
 * Get the currently active n8n configuration (backward compatible)
 */
export async function getN8nConfig(): Promise<N8nConfig | null> {
  try {
    const servers = await getServers();
    if (servers.length === 0) return null;

    const activeId = await getActiveServerId();
    if (activeId) {
        const activeServer = servers.find(s => s.id === activeId);
        if (activeServer) return activeServer;
    }

    // Fallback: return first server if active ID is invalid or missing
    return servers[0];
  } catch (error) {
    console.error('Error getting n8n config:', error);
    return null;
  }
}

/**
 * Check if any n8n configuration exists
 */
export async function hasN8nConfig(): Promise<boolean> {
  const servers = await getServers();
  return servers.length > 0;
}

// Deprecated simplified save, mapped to saveServer for one-shot config.
// Maintained for compatibility if other files call it blindly.
export async function saveN8nConfig(config: N8nConfig): Promise<void> {
    await saveServer(config);
}

