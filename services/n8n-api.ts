import { getN8nConfig } from './storage';
import { N8nWorkflow, N8nListResponse, N8nExecution } from '@/types/n8n';

/**
 * n8n API Client
 * Handles all communication with the n8n REST API
 */

class N8nApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'N8nApiError';
  }
}

/**
 * Base API request handler
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const config = await getN8nConfig();

  if (!config) {
    throw new N8nApiError('No n8n configuration found');
  }

  const url = `${config.serverUrl}/api/v1${endpoint}`;

  try {
    console.log('[n8n-api] Fetching:', url);
    console.log('[n8n-api] API Key:', config.apiKey.substring(0, 10) + '...');

    const fetchOptions = {
      ...options,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    };

    console.log('[n8n-api] Request headers:', JSON.stringify(fetchOptions.headers, null, 2));

    const response = await fetch(url, fetchOptions);

    console.log('[n8n-api] Response status:', response.status);
    console.log('[n8n-api] Response headers:', JSON.stringify(
      Object.fromEntries(response.headers.entries()),
      null,
      2
    ));

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText} (${response.status})`;

      try {
        const errorBody = await response.text();
        console.log('[n8n-api] Error body:', errorBody);
        if (errorBody) {
          errorMessage += `\n${errorBody}`;
        }
      } catch (e) {
        console.log('[n8n-api] Could not parse error body:', e);
      }

      throw new N8nApiError(errorMessage, response.status);
    }

    const data = await response.json();
    console.log('[n8n-api] Response data type:', Array.isArray(data) ? 'array' : typeof data);
    console.log('[n8n-api] Response data keys:', Object.keys(data));
    return data;
  } catch (error) {
    if (error instanceof N8nApiError) {
      console.log('[n8n-api] N8nApiError:', error.message);
      throw error;
    }

    const errorMessage = error instanceof Error
      ? `Network error: ${error.message}`
      : 'Unknown error occurred';

    console.log('[n8n-api] Unexpected error:', errorMessage);
    console.log('[n8n-api] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw new N8nApiError(errorMessage);
  }
}

/**
 * Get all workflows
 */
export async function getWorkflows(): Promise<N8nWorkflow[]> {
  const response = await apiRequest<N8nListResponse<N8nWorkflow> | N8nWorkflow[]>(
    '/workflows'
  );

  // Handle both response formats: {data: []} and direct array []
  if (Array.isArray(response)) {
    return response;
  }

  return response.data;
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(id: string): Promise<N8nWorkflow> {
  return await apiRequest<N8nWorkflow>(`/workflows/${id}`);
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(id: string): Promise<N8nWorkflow> {
  return await apiRequest<N8nWorkflow>(`/workflows/${id}/activate`, {
    method: 'POST',
  });
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(id: string): Promise<N8nWorkflow> {
  return await apiRequest<N8nWorkflow>(`/workflows/${id}/deactivate`, {
    method: 'POST',
  });
}

/**
 * Get workflow executions
 */
export async function getExecutions(
  workflowId?: string
): Promise<N8nExecution[]> {
  const endpoint = workflowId
    ? `/executions?workflowId=${workflowId}`
    : '/executions';
  const response = await apiRequest<N8nListResponse<N8nExecution>>(endpoint);
  return response.data;
}

/**
 * Get a single execution by ID
 * includeData=true returns full execution data including node results
 */
export async function getExecution(id: string): Promise<N8nExecution> {
  return await apiRequest<N8nExecution>(`/executions/${id}?includeData=true`);
}
