# System Architecture

Detailed system design, component interactions, and implementation decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│         (notification_app_fe)                                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ App.jsx (Main Router & Theme Provider)                 │  │
│  │  - AppBar with navigation                              │  │
│  │  - Material UI ThemeProvider                           │  │
│  │  - Page routing (All / Priority)                       │  │
│  └────────────────────────────────────────────────────────┘  │
│           ↓                                    ↓              │
│  ┌──────────────────────────┐    ┌──────────────────────────┐ │
│  │ AllNotificationsPage     │    │ PriorityNotificationsPage│ │
│  │  - useNotificationsList  │    │  - usePriorityNotifications
│  │  - useNotificationFilt.  │    │  - Top-N slider (1-20)  │ │
│  │  - FilterPanel           │    │  - Auto-refresh (30s)   │ │
│  │  - Pagination (10/page)  │    │  - Read/unread toggle   │ │
│  │  - Type filter + search  │    │                          │ │
│  └──────────────────────────┘    └──────────────────────────┘ │
│           ↓                                    ↓              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Components                                              │  │
│  │  - NotificationCard (individual item display)          │  │
│  │  - FilterPanel (search + type select)                  │  │
│  │  - StateComponents (Loading/Empty/Error/Pagination)   │  │
│  └────────────────────────────────────────────────────────┘  │
│           ↓                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Services & Hooks                                        │  │
│  │  - notificationApiService (Axios HTTP client)          │  │
│  │  - notificationLogger (Middleware wrapper)             │  │
│  │  - useNotifications (Custom hooks)                     │  │
│  │  - useNotificationFiltering (Search/filter state)      │  │
│  └────────────────────────────────────────────────────────┘  │
│           ↓                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Logging Middleware                                      │  │
│  │  - Log() — Structured logging                          │  │
│  │  - getAccessToken() — Token lifecycle                  │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
        ↓ HTTP Requests                                          
        │ (with Bearer token)                                    
        │                                                        
        ↓                                                        
┌─────────────────────────────────────────────────────────────┐
│                    Backend API                               │
│                                                               │
│  POST /evaluation-service/auth                              │
│    → acquire access_token                                    │
│                                                               │
│  GET /evaluation-service/notifications                      │
│    → return array of notifications                           │
│    (params: limit, page, type)                               │
│                                                               │
│  POST /evaluation-service/logs                              │
│    → store log entries                                       │
│    (headers: Authorization: Bearer token)                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

### Pages

#### AllNotificationsPage.jsx
```
AllNotificationsPage
├── useNotificationsList (hook)
│   ├── API fetch with pagination
│   └── Loading/error state
├── useNotificationFiltering (hook)
│   ├── Type filter state
│   ├── Search text state
│   └── Read/unread state map
├── FilterPanel (component)
│   ├── Search TextField
│   ├── Type Select
│   └── Clear Filters Button
├── NotificationCard[] (components)
│   ├── Read/unread badge
│   ├── Type Chip
│   └── Delete/Mark buttons
└── PaginationControls (component)
    ├── Pagination widget
    └── Item count display
```

#### PriorityNotificationsPage.jsx
```
PriorityNotificationsPage
├── usePriorityNotifications (hook)
│   ├── Auto-fetch every 30s
│   └── Top-10 by default
├── Slider (Material UI)
│   └── Select N (1-20)
├── NotificationCard[] (components)
│   ├── Read/unread badge
│   ├── Type Chip
│   └── Delete/Mark buttons
└── EmptyState / LoadingState / ErrorDisplay
```

## Data Flow

### Fetch → Display Flow

```
1. Component Mount
   ↓
2. useNotificationsList / usePriorityNotifications (hook)
   ↓
3. notificationApiClient.retrieveAllNotifications()
   ↓
4. notificationLogger.logApiCall() [logs start]
   ↓
5. axios.get() → /evaluation-service/notifications
   ↓
6. Response validation & transformation
   ↓
7. notificationLogger.logApiCall() [logs success/error]
   ↓
8. setState(notifications)
   ↓
9. Component re-renders with new data
```

### User Interaction → Logging Flow

```
1. User clicks "Mark as Read"
   ↓
2. toggleNotificationRead(id) [local state]
   ↓
3. notificationLogger.logUserAction('Toggle read status', {...})
   ↓
4. Log entry sent to /evaluation-service/logs
   ↓
5. notificationLogger receives response (or error)
   ↓
6. Component updates UI (no backend state change)
```

### Token Lifecycle

```
1. App starts → useNotificationsList calls hook
   ↓
2. useNotificationsList calls notificationApiClient
   ↓
3. API client attempts request (needs token)
   ↓
4. Middleware calls getAccessToken()
   ↓
5. Check: is cached token still valid?
   ├─ YES → use cached token → skip to step 8
   └─ NO → continue to step 6
   ↓
6. requestAccessToken()
   ↓
7. POST /evaluation-service/auth with credentials
   ↓
8. Store token in cache with expiry
   ↓
9. Add Authorization header to API request
   ↓
10. GET /evaluation-service/notifications
   ↓
11. Check response status
    ├─ 200 OK → return data
    ├─ 401 Unauthorized → force refresh and retry (step 6)
    └─ Other error → throw error
```

## Module Responsibilities

### logging_middleware/auth.js

**Purpose**: Manage access token lifecycle (acquire, cache, reuse, refresh)

**Exports**:
- `configureAuth({ baseUrl, credentials })` — Set up auth config
- `getAccessToken(options, fetchImpl)` — Get/reuse token
- `requestAccessToken(fetchImpl)` — Force new token request
- `getAuthConfig()` — Inspect current config
- `discardTokenCache()` — Clear cached token

**Behavior**:
- Caches token after acquisition
- Returns cached token if valid (expiry buffer: 30s)
- Refreshes on expiry or 401 response
- Validates credentials before auth

### logging_middleware/logger.js

**Purpose**: Provide structured logging interface for all application layers

**Exports**:
- `Log(stack, level, package, message, meta, options)` — Main logging function

**Parameters**:
- `stack`: "frontend" (enum)
- `level`: "debug" | "info" | "warn" | "error" | "fatal"
- `package`: frontend package (api, component, hook, page, state, style) or common (auth, config, middleware, utils)
- `message`: String or object
- `meta`: Metadata (object)
- `options`: { fetchImpl } for custom fetch implementation

**Flow**:
1. Validate all parameters
2. Get access token via getAccessToken()
3. Build structured log entry with timestamp
4. POST to /evaluation-service/logs with Bearer token
5. On 401: Force token refresh and retry once
6. Return response or throw error

### logging_middleware/config.js

**Purpose**: Centralized configuration, constants, and validation rules

**Exports**:
- `apiConfiguration` — API URLs and timeouts
- `tokenManagementConfig` — Token TTL and buffers
- `loggingSchemaConfig` — Valid values (stacks, levels, packages)
- `errorMessages` — User-friendly error templates
- `validateConfigurationIntegrity(obj)` — Config validator
- `validateLogSchema(entry)` — Log entry validator

### priority_inbox/priorityInbox.js

**Purpose**: Compute top-N notifications based on priority rules

**Exports**:
- `topNByPriority(notifications, N)` — Sort-based O(M log M)
- `topNByHeap(notifications, N)` — Min-heap O(M log N)
- `fetchAndGetTopN(options)` — API integration wrapper

**Priority Algorithm**:
1. Group by type (Placement=3, Result=2, Event=1)
2. Sort by type descending (higher priority first)
3. Within each type, sort by timestamp descending (newest first)
4. Return top N

**Efficiency**:
- Small dataset (< 1000): Use sorting
- Large dataset (> 1000): Use min-heap
- Streaming scenario: Min-heap with fixed size O(N)

### notification_app_fe/src/services/notificationApiService.js

**Purpose**: HTTP client for backend API with error handling

**Methods**:
- `retrieveAllNotifications(queryParams)` — Fetch with pagination/filtering
- `retrieveTopPriorityNotifications(limit)` — Fetch top-N priority
- `filterNotificationsByType(type)` — Fetch by type

**Behavior**:
- Uses axios for HTTP
- Logs all API calls via notificationLogger
- Handles errors gracefully
- Validates response structure
- Returns enriched data or throws descriptive errors

### notification_app_fe/src/services/notificationLogger.js

**Purpose**: Bridge between React components and logging middleware

**Methods**:
- `logApiCall(endpoint, method, statusCode)`
- `logApiError(endpoint, method, error, statusCode)`
- `logComponentLifecycle(componentName, event)`
- `logStateChange(source, description, metadata)`
- `logUserAction(actionName, metadata)`
- `logUIError(componentName, error, details)`

**Behavior**:
- Wraps Log() from logging middleware
- Catches logging errors (silent fail)
- Provides semantic methods for React context
- No console.log usage

### Custom Hooks

#### useNotificationsList(limit, page)
```javascript
Returns: {
  notifications: [],        // fetched data
  isLoading: boolean,      // fetch in progress
  error: string | null,    // error message
  pagination: {            // pagination state
    currentPage: number,
    itemsPerPage: number,
    totalItems: number
  },
  goToPage(pageNum),       // navigate to page
  refreshNotifications()   // manual refresh
}
```

**Implementation**:
- Calls notificationApiClient.retrieveAllNotifications()
- Manages loading/error state
- Auto-fetches on mount

#### usePriorityNotifications(refreshIntervalMs)
```javascript
Returns: {
  topPriority: [],         // priority notifications
  isLoading: boolean,
  error: string | null,
  manualRefresh()          // refresh on demand
}
```

**Implementation**:
- Calls notificationApiClient.retrieveTopPriorityNotifications()
- Auto-refreshes every 30 seconds via setInterval
- Cleans up interval on unmount

#### useNotificationFiltering(notifications)
```javascript
Returns: {
  notifications: [],       // filtered result
  allNotifications: [],    // original array
  updateSource(newArray),
  setTypeFilter(type),
  activeTypeFilter: string | null,
  searchText: string,
  setSearchText(text),
  toggleRead(id),
  isRead(id): boolean,
  stats: {                 // statistics
    totalCount: number,
    unreadCount: number,
    typeDistribution: {}
  }
}
```

**Implementation**:
- Filters by type (OR operation with search)
- Maintains read/unread state map
- Calculates statistics
- No backend persistence

## State Management

### Frontend State

**Global State**: None (component-level only)

**Component State**:
- `AllNotificationsPage`:
  - Notification list (from hook)
  - Pagination state
  - Filter state (type, search)
  - Read/unread map
  - Deleted IDs (local)

- `PriorityNotificationsPage`:
  - Priority list (from hook)
  - Top-N count (slider)
  - Read/unread map
  - Deleted IDs (local)

**Persistence**: None (all state cleared on page refresh)

**Backend Sync**: Read/unread is frontend-only (not persisted)

## Error Handling

### API Errors

```
Network Error
  ↓
API Error (401, 500, etc.)
  ↓
Parsing Error (invalid JSON)
  ↓
Validation Error (wrong format)
  ↓
Caught & logged → ErrorDisplay component
```

### Logging Errors

- If logging fails, request continues (fail-silently)
- Errors logged via notificationLogger, not console.log
- 401 triggers automatic token refresh and retry

### User Errors

- Empty notifications → EmptyState component
- Bad search → No results (not an error)
- Filter has no matches → EmptyState

## Performance Considerations

### Frontend Optimization

1. **Pagination**: 10 items/page (not 100+)
2. **Lazy Rendering**: Only visible items rendered
3. **Memoization**: useMemo for filtered results
4. **Debounce**: (Optional) Search input could be debounced
5. **Code Splitting**: (Optional) Load pages on-demand

### Backend Optimization

1. **Heap Algorithm**: O(M log N) for large datasets
2. **Caching**: Top-10 could be cached for 30s
3. **Batching**: Fetch latest 50, compute top-10 locally
4. **Streaming**: For real-time: use WebSocket + heap

## Security

### Authentication

- ✅ Bearer token in Authorization header
- ✅ Token refresh on expiry
- ✅ 401 handling with retry
- ✅ Credentials stored securely (not in code/comments)

### Data Validation

- ✅ Input validation (notification schema)
- ✅ Output validation (API response)
- ✅ Log level/package validation
- ✅ No SQL injection (not using SQL)

### Privacy

- ✅ No sensitive data logged (no passwords/tokens)
- ✅ Read/unread state local to client
- ✅ No user tracking (beyond logs)

## Scalability Path

### Current Scale

- Supports: ~1000 notifications
- Pages: 2 (All + Priority)
- Users: Single user (no auth in frontend)

### Scale Up Strategies

1. **Database Indexing**: Index by type, timestamp
2. **Caching Layer**: Redis for top-10 notifications
3. **Event Streaming**: Kafka for real-time updates
4. **Distributed Processing**: Partition by user/tenant
5. **WebSocket**: Real-time push instead of polling
6. **GraphQL**: Reduce over-fetching
7. **CDN**: Static assets at edge

### Load Balancing

- API could be behind load balancer
- Multiple instances sharing Redis cache
- Notifications partitioned by tenant

## Testing Strategy (Not Implemented)

### Unit Tests

- `topNByHeap()` — Priority algorithm correctness
- `topNByPriority()` — Sort-based algorithm
- `validateConfigurationIntegrity()` — Config validation
- `Log()` — Logging middleware

### Integration Tests

- API client + mock server
- Hook + component rendering
- Filter logic + display

### E2E Tests

- Full user flow: fetch → filter → display
- Priority page auto-refresh
- Read/unread toggle

## Deployment

### Development

```bash
npm install
npm start
```

### Production

```bash
npm install --production
npm run build
# Serve dist/ folder via static server (nginx, Apache)
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
```

---

**Architecture Version**: 1.0  
**Last Updated**: May 2, 2026  
**Status**: Production-Ready
