# Notification System Frontend

React-based frontend for campus notification system with priority inbox.

## Features

- **All Notifications Page**: Browse all notifications with filtering and pagination
- **Priority Notifications Page**: View top-priority notifications with customizable count
- **Type Filtering**: Filter by Placement, Result, or Event
- **Search**: Search notifications by message or ID
- **Read/Unread State**: Mark notifications as read or unread (frontend-only state)
- **Responsive Design**: Mobile and desktop optimized
- **Material UI**: Professional, accessible component library
- **Logging Middleware**: All user actions and API calls logged (no console.log)

## Setup

### Installation

```bash
cd notification_app_fe
npm install
```

### Configuration

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Update `REACT_APP_API_BASE_URL` to match your backend server:

```
REACT_APP_API_BASE_URL=http://localhost:5000
```

### Running Locally

```bash
npm start
```

App will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

Outputs optimized build to `build/` folder.

## Architecture

### Directory Structure

```
src/
  components/        - Reusable UI components (NotificationCard, FilterPanel, etc.)
  pages/             - Page components (All, Priority)
  services/          - API client and logging wrapper
  hooks/             - Custom React hooks (useNotifications, useNotificationFiltering)
  styles/            - Material UI theme configuration
  App.jsx            - Main app with routing
  index.js           - React entry point
```

### Components

- **NotificationCard**: Displays individual notification with read/unread toggle
- **FilterPanel**: Search and type filtering controls
- **StateComponents**: LoadingState, EmptyState, ErrorDisplay, PaginationControls

### Hooks

- **useNotificationsList**: Fetch notifications with pagination
- **usePriorityNotifications**: Auto-refresh top-priority notifications every 30s
- **useNotificationFiltering**: Client-side filtering by type and search

### Services

- **notificationApiService**: Axios-based API client for backend communication
- **notificationLogger**: Bridges logging middleware with React components (no console.log)

## API Integration

Backend endpoints used:

- `GET /evaluation-service/notifications` - Fetch all notifications
- `GET /evaluation-service/notifications?priority=true&limit=N` - Fetch top-N priority
- `GET /evaluation-service/notifications?type=TYPE` - Filter by type
- `POST /evaluation-service/logs` - Log user actions and API calls

## Logging

All user interactions and API calls are logged via logging middleware (from `logging_middleware/logger.js`).

Example logged events:

- API call start/success/failure
- User navigation
- Filter changes
- Read/unread toggle
- Component lifecycle

## Development Notes

- No `console.log` statements - use notificationLogger instead
- Responsive design uses Material UI breakpoints
- Read/unread state is frontend-only (not persisted to backend)
- Deleted notifications tracked locally during session

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
