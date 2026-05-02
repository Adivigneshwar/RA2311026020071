// Notification API service - handles all backend communication with centralized error handling
// Uses logging middleware for tracing all API interactions

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { notificationLogger } from './notificationLogger';
import type { Notification, NotificationApiResponse } from '../types';

const API_BASE_URL: string = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const NOTIFICATIONS_ENDPOINT: string = '/evaluation-service/notifications';

interface QueryParams {
  limit?: number;
  page?: number;
  notification_type?: string | null;
}

interface ApiError extends Error {
  statusCode?: number;
  originalError?: unknown;
}

class NotificationApiClient {
  private baseUrl: string;
  private httpClient: AxiosInstance;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async retrieveAllNotifications(queryParams: QueryParams = {}): Promise<NotificationApiResponse> {
    const { limit = 50, page = 1, notification_type = null } = queryParams;

    try {
      await notificationLogger.logApiCall(NOTIFICATIONS_ENDPOINT, 'GET');

      const config = {
        params: {
          limit,
          page,
          ...(notification_type && { notification_type }),
        },
      };

      const response: AxiosResponse<Notification[]> = await this.httpClient.get(NOTIFICATIONS_ENDPOINT, config);

      await notificationLogger.logApiCall(NOTIFICATIONS_ENDPOINT, 'GET', response.status);

      // Validate response structure
      if (!Array.isArray(response.data)) {
        throw new Error('API returned non-array payload for notifications');
      }

      return {
        notifications: response.data,
        totalCount: response.data.length,
        page,
        limit,
      };
    } catch (err) {
      const statusCode: number | undefined = (err as AxiosError)?.response?.status;
      const errorMsg: string =
        ((err as AxiosError)?.response?.data as Record<string, unknown>)?.message instanceof String
          ? String(((err as AxiosError)?.response?.data as Record<string, unknown>).message)
          : err instanceof Error
          ? err.message
          : 'Unknown error';

      await notificationLogger.logApiError(NOTIFICATIONS_ENDPOINT, 'GET', errorMsg, statusCode);

      const enrichedError: ApiError = new Error(`Failed to retrieve notifications: ${errorMsg}`);
      enrichedError.statusCode = statusCode;
      enrichedError.originalError = err;
      throw enrichedError;
    }
  }

  async retrieveTopPriorityNotifications(limit: number = 10): Promise<Notification[]> {
    try {
      const endpoint: string = `${NOTIFICATIONS_ENDPOINT}?priority=true&limit=${limit}`;
      await notificationLogger.logApiCall(endpoint, 'GET');

      const response: AxiosResponse<Notification[]> = await this.httpClient.get(endpoint);

      await notificationLogger.logApiCall(endpoint, 'GET', response.status);

      if (!Array.isArray(response.data)) {
        throw new Error('Priority notifications API returned non-array');
      }

      return response.data;
    } catch (err) {
      const statusCode: number | undefined = (err as AxiosError)?.response?.status;
      const errorMsg: string =
        ((err as AxiosError)?.response?.data as Record<string, unknown>)?.message instanceof String
          ? String(((err as AxiosError)?.response?.data as Record<string, unknown>).message)
          : err instanceof Error
          ? err.message
          : 'Unknown error';

      await notificationLogger.logApiError(`${NOTIFICATIONS_ENDPOINT}?priority=true`, 'GET', errorMsg, statusCode);

      const enrichedError: ApiError = new Error(`Failed to retrieve priority notifications: ${errorMsg}`);
      enrichedError.statusCode = statusCode;
      throw enrichedError;
    }
  }

  async filterNotificationsByType(notificationType: string): Promise<Notification[]> {
    try {
      await notificationLogger.logApiCall(
        `${NOTIFICATIONS_ENDPOINT}?notification_type=${notificationType}`,
        'GET'
      );

      const response: AxiosResponse<Notification[]> = await this.httpClient.get(NOTIFICATIONS_ENDPOINT, {
        params: { notification_type: notificationType },
      });

      await notificationLogger.logApiCall(NOTIFICATIONS_ENDPOINT, 'GET', response.status);

      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      const statusCode: number | undefined = (err as AxiosError)?.response?.status;
      const errorMsg: string = err instanceof Error ? err.message : 'Unknown error';

      await notificationLogger.logApiError(
        NOTIFICATIONS_ENDPOINT,
        'GET',
        `Filter by ${notificationType}: ${errorMsg}`,
        statusCode
      );

      return [];
    }
  }
}

export const notificationApiClient = new NotificationApiClient();
