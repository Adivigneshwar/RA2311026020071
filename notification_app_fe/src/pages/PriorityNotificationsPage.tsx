// PriorityNotificationsPage - displays top-priority notifications only
// Auto-refreshes every 30 seconds and allows user-selected top-N count

import React, { useState, FC, ReactElement } from 'react';
import {
  Container,
  Box,
  Typography,
  Slider,
  useMediaQuery,
  useTheme,
  Paper,
  Theme,
  SliderProps,
} from '@mui/material';
import NotificationCard from '../components/NotificationCard';
import { LoadingState, EmptyState, ErrorDisplay } from '../components/StateComponents';
import { usePriorityNotifications } from '../hooks/useNotifications';
import { useNotificationFiltering } from '../hooks/useNotificationFiltering';
import { notificationLogger } from '../services/notificationLogger';
import type { Notification } from '../types';

const PriorityNotificationsPage: FC = (): ReactElement => {
  const theme: Theme = useTheme();
  const isMobileScreen: boolean = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch priority notifications
  const {
    topPriority: priorityNotifications,
    isLoading: isFetching,
    error: fetchError,
    manualRefresh: refreshPriority,
  } = usePriorityNotifications(30000);

  // Filter support (for read/unread state)
  const {
    toggleRead: toggleNotificationRead,
    isRead: checkIsRead,
  } = useNotificationFiltering(priorityNotifications);

  // User-selectable top-N count
  const [topNCount, setTopNCount] = useState<number>(10);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Handle count slider change
  const handleTopNChange = (event: Event, newValue: number | number[]): void => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setTopNCount(value);
    notificationLogger.logUserAction('Change top-N count', { newCount: value });
  };

  // Handle delete
  const handleDelete = (notificationId: string): void => {
    setDeletedIds((prev) => new Set([...prev, notificationId]));
    notificationLogger.logUserAction('Delete priority notification', { id: notificationId });
  };

  // Filter top N and exclude deleted
  const displayedNotifications: Notification[] = priorityNotifications
    .slice(0, topNCount)
    .filter((n) => !deletedIds.has(n.id));

  if (isFetching && priorityNotifications.length === 0) {
    return (
      <Container maxWidth="md" sx={{ paddingY: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ marginBottom: 3 }}>
          Top Priority Notifications
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
          sx={{ marginBottom: 2 }}
        >
          Top Priority Notifications
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 2 }}>
          Showing {displayedNotifications.length} of {priorityNotifications.length} priority items
        </Typography>
      </Box>

      {fetchError && (
        <ErrorDisplay message={fetchError} onRetry={refreshPriority} />
      )}

      <Paper
        elevation={0}
        sx={{
          padding: 3,
          marginBottom: 3,
          backgroundColor: theme.palette.background.default,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <Typography variant="subtitle2" sx={{ marginBottom: 2, fontWeight: 600 }}>
          Show Top N Notifications
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={topNCount}
            onChange={handleTopNChange}
            min={1}
            max={20}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{
              flex: 1,
              maxWidth: isMobileScreen ? '100%' : 300,
            }}
          />
          <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
            {topNCount}
          </Typography>
        </Box>
      </Paper>

      {displayedNotifications.length === 0 ? (
        <EmptyState
          title="No Priority Notifications"
          message="All priority notifications have been cleared or deleted."
        />
      ) : (
        <Box>
          {displayedNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              isRead={checkIsRead(notification.id)}
              onToggleRead={() => toggleNotificationRead(notification.id)}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default PriorityNotificationsPage;
