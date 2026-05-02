// AllNotificationsPage - displays all notifications with filtering and pagination
// Features: type filter, search, pagination, mark read/unread

import React, { useCallback } from 'react';
import { Container, Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import NotificationCard from '../components/NotificationCard';
import FilterPanel from '../components/FilterPanel';
import {
  LoadingState,
  EmptyState,
  ErrorDisplay,
  PaginationControls,
} from '../components/StateComponents';
import { useNotificationsList } from '../hooks/useNotifications';
import { useNotificationFiltering } from '../hooks/useNotificationFiltering';
import { notificationLogger } from '../services/notificationLogger';

export default function AllNotificationsPage() {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch notifications
  const {
    notifications: fetchedNotifications,
    isLoading: isFetching,
    error: fetchError,
    pagination: paginationData,
    goToPage: navigateToPage,
    refreshNotifications: refetchData,
  } = useNotificationsList(50, 1);

  // Handle filtering
  const {
    notifications: filteredNotifications,
    setTypeFilter: applyTypeFilter,
    activeTypeFilter: currentTypeFilter,
    searchText: currentSearchText,
    setSearchText: updateSearchInput,
    toggleRead: toggleNotificationRead,
    isRead: checkIsRead,
    stats: notificationStats,
    availableTypes: typeOptions,
  } = useNotificationFiltering(fetchedNotifications);

  // Track deleted notifications locally (frontend only)
  const [deletedIds, setDeletedIds] = React.useState(new Set());

  // Calculate pagination for filtered results
  const itemsPerPageForFiltered = 10;
  const filteredAfterDeleted = filteredNotifications.filter((n) => !deletedIds.has(n.id));
  const totalPages = Math.ceil(filteredAfterDeleted.length / itemsPerPageForFiltered);
  const [currentFilteredPage, setCurrentFilteredPage] = React.useState(1);

  const paginatedNotifications = React.useMemo(() => {
    const start = (currentFilteredPage - 1) * itemsPerPageForFiltered;
    const end = start + itemsPerPageForFiltered;
    return filteredAfterDeleted.slice(start, end);
  }, [filteredAfterDeleted, currentFilteredPage]);

  // Delete handler
  const handleDelete = useCallback((notificationId) => {
    setDeletedIds((prev) => new Set([...prev, notificationId]));
    notificationLogger.logUserAction('Delete notification (frontend only)', {
      id: notificationId,
    });
  }, []);

  // Clear all filters
  const handleClearAllFilters = () => {
    applyTypeFilter(null);
    updateSearchInput('');
    notificationLogger.logUserAction('Clear all filters');
  };

  if (isFetching) {
    return (
      <Container maxWidth="md" sx={{ paddingY: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ marginBottom: 3 }}>
          All Notifications
        </Typography>
        <LoadingState count={5} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ paddingY: 4 }}>
      <Box sx={{ marginBottom: 4 }}>
        <Typography
          variant={isMobileScreen ? 'h5' : 'h4'}
          gutterBottom
          sx={{ marginBottom: 1 }}
        >
          All Notifications
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Total: {notificationStats.totalCount} | Unread: {notificationStats.unreadCount}
        </Typography>
      </Box>

      <FilterPanel
        searchValue={currentSearchText}
        onSearchChange={updateSearchInput}
        selectedType={currentTypeFilter}
        onTypeChange={applyTypeFilter}
        availableTypes={typeOptions}
        onClearFilters={handleClearAllFilters}
      />

      {fetchError && (
        <ErrorDisplay message={fetchError} onRetry={refetchData} />
      )}

      {paginatedNotifications.length === 0 ? (
        <EmptyState
          title="No Notifications Found"
          message={
            currentSearchText || currentTypeFilter
              ? 'Try adjusting your filters or search terms.'
              : 'No notifications available at this time.'
          }
        />
      ) : (
        <>
          <Box sx={{ marginBottom: 2 }}>
            {paginatedNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                isRead={checkIsRead(notification.id)}
                onToggleRead={() => toggleNotificationRead(notification.id)}
                onDelete={handleDelete}
              />
            ))}
          </Box>

          <PaginationControls
            currentPage={currentFilteredPage}
            totalPages={totalPages}
            onPageChange={setCurrentFilteredPage}
            itemsPerPage={itemsPerPageForFiltered}
            totalItems={filteredAfterDeleted.length}
          />
        </>
      )}
    </Container>
  );
}
