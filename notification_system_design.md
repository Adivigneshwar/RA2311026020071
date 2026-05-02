# Notification System Design

## Priority Logic

Priority order (highest → lowest):
- Placement
- Result
- Event

Notifications are first grouped by their `Type` (Placement, Result, Event). Within each group, notifications are ordered by most recent `Timestamp` (descending).

To produce the final priority list we:
1. Include all notifications belonging to higher-priority types before lower priorities.
2. Within the same type, sort by timestamp descending.
3. Take the top N (10 by default) after applying the above ordering.

Example: If there are 5 Placement, 20 Result, and 8 Event notifications, the top 10 will contain all 5 Placement first (sorted), then the 5 most recent Result notifications.

## Data Structures

- Input: an array of notification objects: { id, type, message, timestamp }

- For naive implementations: sort entire array using a composite comparator (type priority then timestamp). Complexity: O(M log M) where M is number of notifications.

- For streaming or high-volume scenarios: maintain a fixed-size min-heap (priority queue) keyed by (typePriority, timestamp) to track top-N. Complexity: O(M log N) and memory O(N). This is efficient when M >> N.

Heap ordering (min-heap) is implemented with a comparison that treats higher-priority notifications as "larger" so that the heap root is the least-priority among the selected top-N and can be popped when a better notification arrives.

## Scalability

- For small-to-moderate volumes (< 100k), sorting the whole payload is acceptable and simpler to maintain.

- For real-time streams or very large volumes, use streaming processing with a fixed-size min-heap. This limits memory usage and keeps CPU bounded by log N per item.

- For distributed scale, partition notifications by user or tenant and compute top-N per partition. Use distributed message queues (Kafka/RabbitMQ) and aggregate workers to maintain per-user top lists.

- Persisted caches: To avoid re-computation on each request, cache the computed top-N for a short TTL (e.g., 30 seconds) and invalidate on incoming notifications.

## Fault tolerance and logging

- All API calls and processing steps must be logged using the provided logging middleware (`logging_middleware/logger.js`) with appropriate levels:
  - `info` for successful fetch and summary
  - `debug` for internal steps when needed
  - `error` for API failures or processing exceptions

- Token acquisition uses the logging middleware's `auth.js` module to obtain and refresh tokens.

## Output

- The module exposes a function `getPriorityNotifications(limit = 10)` that returns a promise resolving to an array of top notifications in priority order.

- For CLI/demo runs, the module writes formatted JSON to stdout and also logs the summary using the logging middleware.
