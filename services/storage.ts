import * as SecureStore from 'expo-secure-store';
import { N8nConfig } from '@/types/n8n';

const STORAGE_KEYS = {
  SERVER_URL: 'n8n_server_url',
  API_KEY: 'n8n_api_key',
} as const;

/**
 * Save n8n configuration to secure storage
 */
export async function saveN8nConfig(config: N8nConfig): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.SERVER_URL, config.serverUrl);
    await SecureStore.setItemAsync(STORAGE_KEYS.API_KEY, config.apiKey);
  } catch (error) {
    console.error('Error saving n8n config:', error);
    throw new Error('Failed to save configuration');
  }
}

/**
 * Get n8n configuration from secure storage
 */
export async function getN8nConfig(): Promise<N8nConfig | null> {
  try {
    const serverUrl = await SecureStore.getItemAsync(STORAGE_KEYS.SERVER_URL);
    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);

    if (!serverUrl || !apiKey) {
      return null;
    }

    return { serverUrl, apiKey };
  } catch (error) {
    console.error('Error getting n8n config:', error);
    return null;
  }
}

/**
 * Clear n8n configuration from secure storage
 */
export async function clearN8nConfig(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SERVER_URL);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.API_KEY);
  } catch (error) {
    console.error('Error clearing n8n config:', error);
    throw new Error('Failed to clear configuration');
  }
}

/**
 * Check if n8n configuration exists
 */
export async function hasN8nConfig(): Promise<boolean> {
  const config = await getN8nConfig();
  return config !== null;
}
