// NotificationCard component - displays individual notification with read/unread state
// Responsive card with type badge, message, timestamp, and interaction controls

import React, { FC, ReactElement } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
  Theme,
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { notificationLogger } from '../services/notificationLogger';
import type { Notification } from '../types';

const TYPE_COLOR_MAP: Record<string, 'info' | 'success' | 'warning'> = {
  Event: 'info',
  Result: 'success',
  Placement: 'warning',
};

interface NotificationCardProps {
  notification: Notification;
  isRead: boolean;
  onToggleRead: () => void;
  onDelete: (id: string) => void;
}

const NotificationCard = React.forwardRef<HTMLDivElement, NotificationCardProps>(
  ({ notification, isRead, onToggleRead, onDelete }, ref): ReactElement => {
    const theme: Theme = useTheme();
    const isMobileScreen: boolean = useMediaQuery(theme.breakpoints.down('sm'));

    const handleReadToggle = async (): Promise<void> => {
      onToggleRead();
      await notificationLogger.logUserAction('Toggle read status', {
        notificationId: notification.id,
        notificationType: notification.type,
      });
    };

    const handleDelete = async (): Promise<void> => {
      onDelete(notification.id);
      await notificationLogger.logUserAction('Delete notification', {
        notificationId: notification.id,
      });
    };

    const formattedTimestamp: string = notification.timestamp
      ? new Date(notification.timestamp).toLocaleString()
      : 'Unknown time';

    return (
      <Card
        ref={ref}
        sx={{
          marginBottom: 2,
          backgroundColor: isRead ? '#f5f5f5' : '#ffffff',
          borderLeft: `4px solid ${theme.palette[TYPE_COLOR_MAP[notification.type] || 'info'].main}`,
          opacity: isRead ? 0.7 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0,0,0,0.12)',
            transform: isMobileScreen ? 'none' : 'translateY(-2px)',
          },
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexDirection: isMobileScreen ? 'column' : 'row',
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, marginBottom: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={notification.type || 'Unknown'}
                  color={TYPE_COLOR_MAP[notification.type] || 'info'}
                  size="small"
                  variant={isRead ? 'outlined' : 'filled'}
                />
                {!isRead && (
                  <Chip
                    label="New"
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.success.main,
                      color: '#fff',
                    }}
                  />
                )}
              </Box>

              <Typography
                variant={isMobileScreen ? 'body2' : 'body1'}
                sx={{
                  fontWeight: isRead ? 400 : 600,
                  marginBottom: 1,
                  wordBreak: 'break-word',
                }}
              >
                {notification.message || 'No message content'}
              </Typography>

              <Typography variant="caption" color="textSecondary">
                {formattedTimestamp}
              </Typography>

              {notification.id && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    marginTop: 0.5,
                    color: theme.palette.text.disabled,
                  }}
                >
                  ID: {notification.id}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>

        <CardActions
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 0.5,
            paddingTop: 0,
          }}
        >
          <IconButton
            size="small"
            onClick={handleReadToggle}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
            color={isRead ? 'default' : 'primary'}
          >
            {isRead ? <MailOutlineIcon /> : <MailIcon />}
          </IconButton>

          <IconButton
            size="small"
            onClick={handleDelete}
            title="Delete notification"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </CardActions>
      </Card>
    );
  }
);

NotificationCard.displayName = 'NotificationCard';

export default NotificationCard;
