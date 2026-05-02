


import { useState, useCallback, useMemo } from 'react';
import { notificationLogger } from '../services/notificationLogger';
import type { Notification, NotificationStats } from '../types';

interface UseNotificationFilteringReturn {
  notifications: Notification[];
  allNotifications: Notification[];
  updateSource: (notifications: Notification[]) => void;
  setTypeFilter: (type: string | null) => void;
  activeTypeFilter: string | null;
  searchText: string;
  setSearchText: (text: string) => void;
  toggleRead: (id: string) => void;
  isRead: (id: string) => boolean;
  stats: NotificationStats;
  availableTypes: string[];
}

const NOTIFICATION_TYPES: string[] = ['Event', 'Result', 'Placement'];

export function useNotificationFiltering(initialNotifications: Notification[] = []): UseNotificationFilteringReturn {
  const [allNotifications, setAllNotifications] = useState<Notification[]>(initialNotifications);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [readStatusMap, setReadStatusMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  
  const updateNotificationSource = useCallback((newNotifications: Notification[]): void => {
    setAllNotifications(newNotifications);
    notificationLogger.logStateChange('useNotificationFiltering', `Updated notification source with ${newNotifications.length} items`);
  }, []);

  
  const toggleReadStatus = useCallback((notificationId: string): void => {
    setReadStatusMap((prev) => {
      const newStatus: boolean = !prev[notificationId];
      notificationLogger.logUserAction('Toggle notification read status', {
        notificationId,
        isNowRead: newStatus,
      });
      return {
        ...prev,
        [notificationId]: newStatus,
      };
    });
  }, []);

  
  const isNotificationRead = useCallback((notificationId: string): boolean => {
    return readStatusMap[notificationId] ?? false;
  }, [readStatusMap]);

  
  const filteredNotifications: Notification[] = useMemo(() => {
    let result: Notification[] = allNotifications;

    if (activeTypeFilter) {
      result = result.filter((n) => n.type === activeTypeFilter);
    }

    if (searchQuery.trim()) {
      const query: string = searchQuery.toLowerCase();
      result = result.filter((n) =>
        (n.message && n.message.toLowerCase().includes(query)) ||
        (n.id && n.id.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allNotifications, activeTypeFilter, searchQuery]);

  
  const filterStats: NotificationStats = useMemo(() => {
    const stats: NotificationStats = {
      totalCount: allNotifications.length,
      unreadCount: Object.values(readStatusMap).filter((v) => !v).length,
      typeDistribution: {},
    };

    NOTIFICATION_TYPES.forEach((type) => {
      stats.typeDistribution[type] = allNotifications.filter((n) => n.type === type).length;
    });

    return stats;
  }, [allNotifications, readStatusMap]);

  return {
    notifications: filteredNotifications,
    allNotifications,
    updateSource: updateNotificationSource,
    setTypeFilter: setActiveTypeFilter,
    activeTypeFilter,
    searchText: searchQuery,
    setSearchText: setSearchQuery,
    toggleRead: toggleReadStatus,
    isRead: isNotificationRead,
    stats: filterStats,
    availableTypes: NOTIFICATION_TYPES,
  };
}
