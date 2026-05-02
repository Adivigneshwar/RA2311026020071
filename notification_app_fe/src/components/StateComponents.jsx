// LoadingState component - displays skeleton or spinner while fetching
import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';

export function LoadingState({ count = 5 }) {
  const theme = useTheme();
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
}

// EmptyState component - displayed when no notifications match filters
import { Typography, Box as MuiBox } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export function EmptyState({ title = 'No Notifications', message = 'No notifications found matching your filters.' }) {
  return (
    <MuiBox
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
    </MuiBox>
  );
}

// ErrorDisplay component - shows API or fetch errors
import Alert from '@mui/material/Alert';

export function ErrorDisplay({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      onClose={onRetry ? undefined : () => {}}
      sx={{ marginBottom: 2 }}
      action={
        onRetry && (
          <Box component="button" onClick={onRetry} sx={{ fontSize: '0.875rem', cursor: 'pointer' }}>
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
}

// PaginationControls component - navigation for multi-page results
import { Pagination, Box as MuiBoxPagination } from '@mui/material';

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <MuiBoxPagination
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
        onChange={(e, page) => onPageChange(page)}
        color="primary"
      />
    </MuiBoxPagination>
  );
}
