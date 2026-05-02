// StateComponents.tsx - displays various UI states (loading, empty, error, pagination)

import React, { FC, ReactElement, MouseEvent } from 'react';
import {
  Box,
  Skeleton,
  useTheme,
  Typography,
  Alert,
  Pagination,
  Theme,
  ButtonProps,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface LoadingStateProps {
  count?: number;
}

export const LoadingState: FC<LoadingStateProps> = ({ count = 5 }): ReactElement => {
  const theme: Theme = useTheme();
  return (
    <Box sx={{ padding: 2 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton
          key={idx}
          variant="rectangular"
          height={120}
          sx={{ marginBottom: 2, borderRadius: theme.shape.borderRadius }}
        />
      ))}
    </Box>
  );
};

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title = 'No Notifications',
  message = 'No notifications found matching your filters.',
}): ReactElement => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        textAlign: 'center',
        minHeight: 250,
      }}
    >
      <InboxIcon sx={{ fontSize: 80, color: 'action.disabled', marginBottom: 2 }} />
      <Typography variant="h5" sx={{ marginBottom: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </Box>
  );
};

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorDisplay: FC<ErrorDisplayProps> = ({
  message,
  onRetry,
}): ReactElement => {
  const handleRetryClick = (): void => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <Alert
      severity="error"
      onClose={onRetry ? undefined : () => {}}
      sx={{ marginBottom: 2 }}
      action={
        onRetry && (
          <Box
            component="button"
            onClick={handleRetryClick}
            sx={{ fontSize: '0.875rem', cursor: 'pointer', border: 'none', background: 'none', color: 'inherit' }}
          >
            Retry
          </Box>
        )
      }
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Error Loading Notifications
      </Typography>
      <Typography variant="body2">{message}</Typography>
    </Alert>
  );
};

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export const PaginationControls: FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}): ReactElement | null => {
  if (totalPages <= 1) {
    return null;
  }

  const startItem: number = (currentPage - 1) * itemsPerPage + 1;
  const endItem: number = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (event: ChangeEvent<unknown>, page: number): void => {
    onPageChange(page);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        marginTop: 3,
        paddingTop: 2,
        borderTop: '1px solid #e0e0e0',
      }}
    >
      <Typography variant="body2" color="textSecondary">
        Showing {startItem} to {endItem} of {totalItems} items
      </Typography>
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
      />
    </Box>
  );
};

// Import ChangeEvent for proper typing
import { ChangeEvent } from 'react';
