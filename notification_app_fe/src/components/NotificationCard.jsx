// NotificationCard component - displays individual notification with read/unread state
// Responsive card with type badge, message, timestamp, and interaction controls

import React from 'react';
import PropTypes from 'prop-types';
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
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { notificationLogger } from '../services/notificationLogger';

const TYPE_COLOR_MAP = {
  Event: 'info',
  Result: 'success',
  Placement: 'warning',
};

const NotificationCard = React.forwardRef(
  ({ notification, isRead, onToggleRead, onDelete }, ref) => {
    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const handleReadToggle = async () => {
      onToggleRead(notification.id);
      await notificationLogger.logUserAction('Toggle read status', {
        notificationId: notification.id,
        notificationType: notification.type,
      });
    };

    const handleDelete = async () => {
      onDelete(notification.id);
      await notificationLogger.logUserAction('Delete notification', {
        notificationId: notification.id,
      });
    };

    const formattedTimestamp = notification.timestamp
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

NotificationCard.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['Event', 'Result', 'Placement']),
    message: PropTypes.string,
    timestamp: PropTypes.string,
  }).isRequired,
  isRead: PropTypes.bool,
  onToggleRead: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

NotificationCard.defaultProps = {
  isRead: false,
};

export default NotificationCard;
