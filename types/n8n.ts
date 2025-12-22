/**
 * n8n API Types
 * Based on n8n REST API documentation: https://docs.n8n.io/api/
 */

export interface N8nConfig {
  id?: string;
  name?: string;
  serverUrl: string;
  apiKey: string;
}

export interface N8nServer extends N8nConfig {
  id: string;
  name: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: N8nTag[];
  nodes?: N8nNode[];
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'internal' | 'error' | 'retry';
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: {
    id: string;
    name: string;
  };
  data?: {
    resultData: {
      runData: Record<string, any>;
      error?: {
        message: string;
        stack?: string;
        name?: string;
        node?: {
          name: string;
          type: string;
        };
      };
      lastNodeExecuted?: string;
    };
  };
  status?: 'success' | 'error' | 'waiting' | 'running';
}

export interface N8nTag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, any>;
}

export interface N8nApiResponse<T> {
  data: T;
}

export interface N8nListResponse<T> {
  data: T[];
  nextCursor?: string;
}
