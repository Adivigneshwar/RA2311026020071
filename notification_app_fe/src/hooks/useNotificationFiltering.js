// Custom hook for managing notification filtering and search
// Handles client-side filtering, type categorization, and read/unread state

import { useState, useCallback, useMemo } from 'react';
import { notificationLogger } from '../services/notificationLogger';

const NOTIFICATION_TYPES = ['Event', 'Result', 'Placement'];

export function useNotificationFiltering(initialNotifications = []) {
  const [allNotifications, setAllNotifications] = useState(initialNotifications);
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);
  const [readStatusMap, setReadStatusMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Update all notifications when prop changes
  const updateNotificationSource = useCallback((newNotifications) => {
    setAllNotifications(newNotifications);
    notificationLogger.logStateChange('useNotificationFiltering', `Updated notification source with ${newNotifications.length} items`);
  }, []);

  // Mark a specific notification as read or unread
  const toggleReadStatus = useCallback((notificationId) => {
    setReadStatusMap((prev) => {
      const newStatus = !prev[notificationId];
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

  // Get current read status for a notification (defaults to unread)
  const isNotificationRead = useCallback((notificationId) => {
    return readStatusMap[notificationId] ?? false;
  }, [readStatusMap]);

  // Apply filtering: type filter + search query
  const filteredNotifications = useMemo(() => {
    let result = allNotifications;

    if (activeTypeFilter) {
      result = result.filter((n) => n.type === activeTypeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((n) =>
        (n.message && n.message.toLowerCase().includes(query)) ||
        (n.id && n.id.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allNotifications, activeTypeFilter, searchQuery]);

  // Calculate statistics about notifications
  const filterStats = useMemo(() => {
    const stats = {
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
