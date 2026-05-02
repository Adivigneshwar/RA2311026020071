


import { useState, useEffect, useCallback, FC } from 'react';
import { notificationApiClient } from '../services/notificationApiService';
import { notificationLogger } from '../services/notificationLogger';
import type { Notification, PaginationState, NotificationApiResponse } from '../types';

interface UseNotificationsListReturn {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  goToPage: (page: number) => void;
  refreshNotifications: () => void;
}

export function useNotificationsList(
  initialLimit: number = 50,
  initialPage: number = 1
): UseNotificationsListReturn {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    currentPage: initialPage,
    itemsPerPage: initialLimit,
    totalItems: 0,
  });

  const loadNotifications = useCallback(async (pageNum: number = 1, pageSize: number = initialLimit): Promise<void> => {
    setIsLoading(true);
    setFetchError(null);

    try {
      await notificationLogger.logComponentLifecycle('useNotificationsList', 'Initiating fetch');

      const result: NotificationApiResponse = await notificationApiClient.retrieveAllNotifications({
        page: pageNum,
        limit: pageSize,
      });

      setNotificationList(result.notifications);
      setPaginationState({
        currentPage: pageNum,
        itemsPerPage: pageSize,
        totalItems: result.totalCount,
      });

      await notificationLogger.logStateChange(
        'useNotificationsList',
        `Loaded ${result.notifications.length} notifications`,
        {
          page: pageNum,
          size: pageSize,
        }
      );
    } catch (err) {
      const errorDescription: string = err instanceof Error ? err.message : 'Unknown fetch error';
      setFetchError(errorDescription);

      await notificationLogger.logUIError('useNotificationsList', 'Fetch failed', {
        errorMsg: errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  const navigateToPage = useCallback((pageNum: number): void => {
    loadNotifications(pageNum, paginationState.itemsPerPage);
  }, [loadNotifications, paginationState.itemsPerPage]);

  const refreshList = useCallback((): void => {
    loadNotifications(paginationState.currentPage, paginationState.itemsPerPage);
  }, [loadNotifications, paginationState.currentPage, paginationState.itemsPerPage]);

  
  useEffect(() => {
    loadNotifications(initialPage, initialLimit);
  }, []);

  return {
    notifications: notificationList,
    isLoading,
    error: fetchError,
    pagination: paginationState,
    goToPage: navigateToPage,
    refreshNotifications: refreshList,
  };
}

interface UsePriorityNotificationsReturn {
  topPriority: Notification[];
  isLoading: boolean;
  error: string | null;
  manualRefresh: () => void;
}


export function usePriorityNotifications(refreshIntervalMs: number = 30000): UsePriorityNotificationsReturn {
  const [priorityList, setPriorityList] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPriority = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);

    try {
      await notificationLogger.logComponentLifecycle('usePriorityNotifications', 'Fetching top priority');

      const data: Notification[] = await notificationApiClient.retrieveTopPriorityNotifications(10);

      setPriorityList(data);

      await notificationLogger.logStateChange('usePriorityNotifications', `Loaded ${data.length} priority notifications`, {});
    } catch (err) {
      const errorMsg: string = err instanceof Error ? err.message : 'Unknown error fetching priority';
      setLoadError(errorMsg);

      await notificationLogger.logUIError('usePriorityNotifications', 'Fetch failed', {
        errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriority();
    const intervalId: NodeJS.Timeout = setInterval(fetchPriority, refreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [fetchPriority, refreshIntervalMs]);

  return {
    topPriority: priorityList,
    isLoading,
    error: loadError,
    manualRefresh: fetchPriority,
  };
}
