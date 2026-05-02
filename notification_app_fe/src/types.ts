// types.ts - centralized TypeScript type definitions

export interface Notification {
  id: string;
  type: 'Event' | 'Result' | 'Placement';
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  typeDistribution: Record<string, number>;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface NotificationApiResponse {
  notifications: Notification[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface LoggerMetadata {
  [key: string]: string | number | boolean | object | null | undefined;
}
