// Custom hook for managing notification state and API interaction lifecycle
// Handles fetching, error management, and refresh logic with logging

import { useState, useEffect, useCallback } from 'react';
import { notificationApiClient } from '../services/notificationApiService';
import { notificationLogger } from '../services/notificationLogger';

export function useNotificationsList(initialLimit = 50, initialPage = 1) {
  const [notificationList, setNotificationList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [paginationState, setPaginationState] = useState({
    currentPage: initialPage,
    itemsPerPage: initialLimit,
    totalItems: 0,
  });

  const loadNotifications = useCallback(async (pageNum = 1, pageSize = initialLimit) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      await notificationLogger.logComponentLifecycle('useNotificationsList', 'Initiating fetch');

      const result = await notificationApiClient.retrieveAllNotifications({
        page: pageNum,
        limit: pageSize,
      });

      setNotificationList(result.notifications);
      setPaginationState({
        currentPage: pageNum,
        itemsPerPage: pageSize,
        totalItems: result.totalCount,
      });

      await notificationLogger.logStateChange('useNotificationsList', `Loaded ${result.notifications.length} notifications`, {
        page: pageNum,
        size: pageSize,
      });
    } catch (err) {
      const errorDescription = err.message || 'Unknown fetch error';
      setFetchError(errorDescription);

      await notificationLogger.logUIError('useNotificationsList', 'Fetch failed', {
        errorMsg: errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  const navigateToPage = useCallback((pageNum) => {
    loadNotifications(pageNum, paginationState.itemsPerPage);
  }, [loadNotifications, paginationState.itemsPerPage]);

  const refreshList = useCallback(() => {
    loadNotifications(paginationState.currentPage, paginationState.itemsPerPage);
  }, [loadNotifications, paginationState.currentPage, paginationState.itemsPerPage]);

  // Auto-load on component mount
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

// Hook for top-priority notifications specifically
export function usePriorityNotifications(refreshIntervalMs = 30000) {
  const [priorityList, setPriorityList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fetchPriority = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      await notificationLogger.logComponentLifecycle('usePriorityNotifications', 'Fetching top priority');

      const data = await notificationApiClient.retrieveTopPriorityNotifications(10);

      setPriorityList(data);

      await notificationLogger.logStateChange('usePriorityNotifications', `Loaded ${data.length} priority notifications`, {});
    } catch (err) {
      const errorMsg = err.message || 'Unknown error fetching priority';
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
    const intervalId = setInterval(fetchPriority, refreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [fetchPriority, refreshIntervalMs]);

  return {
    topPriority: priorityList,
    isLoading,
    error: loadError,
    manualRefresh: fetchPriority,
  };
}
