// API configuration and helper functions
import type { User, CreateUserData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new ApiError(response.status, error.message || 'Request failed', error);
  }
  return response.json();
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for future auth
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'Network error - backend may be offline', error);
  }
}

// API service object
export const api = {
  // Health check
  async checkHealth() {
    return apiFetch<{
      status: string;
      message: string;
      timestamp: string;
      environment: string;
    }>('/health');
  },

  // Test connection
  async testConnection() {
    return apiFetch<{
      success: boolean;
      message: string;
      serverTime: string;
    }>('/test');
  },

  // Shipments (placeholder for future)
  async getShipments() {
    return apiFetch<{
      message: string;
      shipments: unknown[];
    }>('/shipments');
  },

  // SMS Notifications
  notifications: {
    async getStatus(token: string) {
      return apiFetch<{
        success: boolean;
        sms: {
          enabled: boolean;
          configured: boolean;
          fromNumber: string;
          simulation: boolean;
        };
      }>('/notifications/status', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    },

    async sendTest(token: string, phoneNumber: string, message?: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result: unknown;
      }>('/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber, message }),
      });
    },

    async sendApprovalNotification(token: string, shipment: unknown, purchaserUserId: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/shipment/approved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId }),
      });
    },

    async sendRejectionNotification(token: string, shipment: unknown, purchaserUserId: string, rejectionReason?: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/shipment/rejected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId, rejectionReason }),
      });
    },

    async sendQuotaWarning(token: string, quotaData: unknown, userIds: string[]) {
      return apiFetch<{
        success: boolean;
        message: string;
        results: unknown[];
      }>('/notifications/quota/warning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quotaData, userIds }),
      });
    },

    async sendBroadcast(token: string, message: string, userIds?: string[], roles?: string[]) {
      return apiFetch<{
        success: boolean;
        message: string;
        sentCount: number;
        totalUsers: number;
        results: unknown[];
      }>('/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message, userIds, roles }),
      });
    },
  },

  // Slack Notifications
  slack: {
    async sendTest(token: string, target: string, message?: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result: unknown;
      }>('/notifications/slack/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ target, message }),
      });
    },

    async sendApprovalNotification(token: string, shipment: unknown, purchaserUserId: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/slack/shipment/approved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId }),
      });
    },

    async sendRejectionNotification(token: string, shipment: unknown, purchaserUserId: string, rejectionReason?: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/slack/shipment/rejected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId, rejectionReason }),
      });
    },

    async sendNewShipmentAutoApprovedNotification(token: string, shipment: unknown, purchaserUserId: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/slack/shipment/new-auto-approved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId }),
      });
    },

    async sendNewShipmentPendingNotification(token: string, shipment: unknown, purchaserUserId: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        result?: unknown;
        skipped?: boolean;
      }>('/notifications/slack/shipment/new-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment, purchaserUserId }),
      });
    },
  },

  // Authentication endpoints
  auth: {
    async login(email: string, password: string) {
      return apiFetch<{
        success: boolean;
        message: string;
        user: User;
        token: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    async getCurrentUser(token: string) {
      return apiFetch<{
        success: boolean;
        user: User;
      }>('/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    },

    async updateProfile(token: string, updates: Partial<User>) {
      return apiFetch<{
        success: boolean;
        message: string;
        user: User;
      }>('/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    },

    async logout(token: string) {
      return apiFetch<{
        success: boolean;
        message: string;
      }>('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    },

    async createUser(token: string, userData: CreateUserData) {
      return apiFetch<{
        success: boolean;
        message: string;
        user: User;
      }>('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
    },

    async getAllUsers(token: string) {
      return apiFetch<{
        success: boolean;
        users: User[];
      }>('/auth/users', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    },

    async getTestCredentials() {
      return apiFetch<{
        success: boolean;
        message: string;
        credentials: { email: string; password: string; role: string }[];
      }>('/auth/test-credentials');
    },
  },
};

// Connection status helper
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const result = await api.checkHealth();
    return result.status === 'ok';
  } catch {
    return false;
  }
}