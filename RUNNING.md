# Running the System Locally

Quick-start guide for running Part 1 (Priority Logic) and Part 2 (React Frontend).

## Prerequisites

- **Node.js**: v14+ (check with `node --version`)
- **npm**: v6+ (check with `npm --version`)
- Git (for cloning)

## Part 1: Priority Inbox Logic

### Quick Demo (Standalone)

Run the priority notification algorithm with sample data:

```bash
cd priority_inbox

# View the code
cat priorityInbox.js

# Create sample data (if not exists)
cat > sample_notifications.json << 'EOF'
[
  {
    "id": "event-001",
    "type": "Event",
    "message": "New tech talk by Prof. Smith tomorrow at 3 PM",
    "timestamp": "2026-05-01T14:00:00Z"
  },
  {
    "id": "placement-001",
    "type": "Placement",
    "message": "Amazon campus recruiting registration open - seats limited to 50",
    "timestamp": "2026-05-02T09:00:00Z"
  },
  {
    "id": "result-001",
    "type": "Result",
    "message": "Summer internship results - check student portal",
    "timestamp": "2026-05-01T16:30:00Z"
  },
  {
    "id": "event-002",
    "type": "Event",
    "message": "Hackathon registration begins next Monday",
    "timestamp": "2026-05-01T10:00:00Z"
  },
  {
    "id": "placement-002",
    "type": "Placement",
    "message": "Goldman Sachs internship program - apply by May 15",
    "timestamp": "2026-05-02T08:00:00Z"
  },
  {
    "id": "result-002",
    "type": "Result",
    "message": "Final exam timetable released",
    "timestamp": "2026-05-02T11:00:00Z"
  }
]
EOF

# Run priority logic
node priorityInbox.js
```

**Expected Output**:
```json
[
  {
    "id": "placement-002",
    "type": "Placement",
    "message": "Goldman Sachs internship program - apply by May 15",
    "timestamp": "2026-05-02T08:00:00Z"
  },
  {
    "id": "placement-001",
    "type": "Placement",
    "message": "Amazon campus recruiting registration open - seats limited to 50",
    "timestamp": "2026-05-02T09:00:00Z"
  },
  {
    "id": "result-002",
    "type": "Result",
    "message": "Final exam timetable released",
    "timestamp": "2026-05-02T11:00:00Z"
  },
  {
    "id": "result-001",
    "type": "Result",
    "message": "Summer internship results - check student portal",
    "timestamp": "2026-05-01T16:30:00Z"
  },
  {
    "id": "event-001",
    "type": "Event",
    "message": "New tech talk by Prof. Smith tomorrow at 3 PM",
    "timestamp": "2026-05-01T14:00:00Z"
  },
  {
    "id": "event-002",
    "type": "Event",
    "message": "Hackathon registration begins next Monday",
    "timestamp": "2026-05-01T10:00:00Z"
  }
]
```

**Observations**:
- Placement notifications first (2 items) sorted by timestamp (newest first)
- Result notifications next (2 items) sorted by timestamp
- Event notifications last (2 items) sorted by timestamp

### How It Works

The algorithm uses **Min-Heap for large datasets** or **Sort for small datasets**:

```
Input: 6 notifications
       ↓
      [Event, Placement, Event, Result, Placement, Result]
       ↓
Priority: Placement(3) > Result(2) > Event(1)
       ↓
GroupBy: [Placement×2, Result×2, Event×2]
       ↓
SortByType: [Placement×2, Result×2, Event×2]
       ↓
SortByTimestamp (within each): [newest→oldest for each type]
       ↓
Output: Top 10 (all 6 in this case)
```

## Part 2: React Frontend

### Setup

```bash
# Navigate to frontend folder
cd notification_app_fe

# Install dependencies (first time only)
npm install

# Copy environment config
cp .env.example .env.local

# Update API base URL (if backend is on different port)
# Edit .env.local:
# REACT_APP_API_BASE_URL=http://localhost:5000
```

### Running Development Server

```bash
cd notification_app_fe
npm start
```

**Output**:
```
Compiled successfully!

You can now view notification-system-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

### Access the App

Open browser to: **http://localhost:3000**

You should see:
- Header with "Notification System" title
- Navigation buttons: "All Notifications" and "Priority Inbox"
- Two pages to explore

### Features to Test

#### Page 1: All Notifications
1. **Filter by Type**:
   - Select "Event" → Shows only Event notifications
   - Select "Result" → Shows only Result notifications
   - Select "Placement" → Shows only Placement notifications
   - Select "Show All" → Shows all again

2. **Search**:
   - Type text in search box → Filters by message content
   - Try: "internship", "exam", "talk", etc.

3. **Pagination**:
   - Shows 10 items per page
   - Use pagination buttons to navigate
   - Text shows "Showing X to Y of Z items"

4. **Read/Unread Toggle**:
   - Click mail icon on right side of card
   - Unread: Solid icon, white background
   - Read: Outline icon, gray background

5. **Delete Notification**:
   - Click trash icon → Removes from list (frontend only)

#### Page 2: Priority Notifications
1. **Auto-Refresh**:
   - List refreshes every 30 seconds automatically
   - Shows latest notifications when tab is active

2. **Top-N Selector**:
   - Slider controls how many to show (1-20)
   - Drag slider to change count
   - List updates immediately

3. **Priority Order**:
   - Placement notifications shown first
   - Result notifications second
   - Event notifications last
   - Within each type: newest timestamps first

4. **Same Controls**:
   - Read/unread toggle works
   - Delete removes from list
   - Both pages share state

### Mobile Testing

Test responsive design:

1. **Chrome DevTools** (F12):
   - Click device icon (top-left)
   - Select "iPhone 12" or "Pixel 5"
   - Observe layout changes:
     - Navigation moves to hamburger menu (mobile)
     - Filter panel stacks vertically
     - Cards scale to 100% width

2. **Expected Mobile Behavior**:
   - All content readable without horizontal scroll
   - Touch-friendly buttons (40×40px minimum)
   - Filter panel optimized for mobile
   - Pagination works on mobile

### Troubleshooting

#### Issue: "Port 3000 already in use"

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows (find PID)
taskkill /PID <PID> /F         # Windows (kill process)

# Or use different port
npm start -- --port 3001
```

#### Issue: "Cannot fetch notifications" (API Error)

1. Check backend is running:
   - Backend should be running on `http://localhost:5000`
   - Or update `REACT_APP_API_BASE_URL` in `.env.local`

2. Check console (F12 → Console tab):
   - Look for error messages
   - Network tab shows failed requests

3. Verify API endpoint:
   - GET http://localhost:5000/evaluation-service/notifications
   - Should return valid JSON array

#### Issue: "No notifications found"

- Check backend is returning data
- Verify notification format:
  ```json
  [
    {
      "id": "unique-id",
      "type": "Event|Result|Placement",
      "message": "notification text",
      "timestamp": "ISO-8601 date"
    }
  ]
  ```

#### Issue: Logging errors in console

- Ignore if app still works (logging failures don't break app)
- Check backend `/evaluation-service/logs` endpoint exists
- If needed, disable auth in `.env.local`

### Building for Production

```bash
cd notification_app_fe

# Build optimized bundle
npm run build

# Output: build/ folder with minified files
# Serve via: npx serve -s build

# Or deploy to static host:
# - Netlify: drag-drop build/ folder
# - Vercel: git push (auto-deploys)
# - AWS S3: upload build/ folder
```

## Running Both Parts Together

### Scenario: Mock API for Local Testing

If backend isn't available, create a mock server:

```bash
# Install mock server (optional)
npm install -g json-server

# Create mock data
cat > db.json << 'EOF'
{
  "evaluation-service": {
    "notifications": [
      {
        "id": "1",
        "type": "Placement",
        "message": "Amazon recruiting",
        "timestamp": "2026-05-02T10:00:00Z"
      },
      {
        "id": "2",
        "type": "Result",
        "message": "Exam results released",
        "timestamp": "2026-05-02T09:00:00Z"
      }
    ]
  }
}
EOF

# Run mock server
json-server --watch db.json --port 5000

# In another terminal, start React app
cd notification_app_fe
npm start
```

## Logging Inspection

### View Logs Being Sent

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by: `evaluation-service/logs`
4. Perform actions (search, filter, etc.)
5. Each action triggers a log POST

### Log Entry Format

```json
{
  "stack": "frontend",
  "level": "info",
  "package": "api",
  "message": "User action: Navigate to page: priority",
  "meta": {},
  "timestamp": "2026-05-02T12:34:56.789Z"
}
```

## Performance Tips

### For Better Performance

1. **Pagination**: Display 10 items, not 100
2. **Search**: Implement client-side debounce (optional)
3. **Lazy Load**: Load images/avatars on scroll (optional)
4. **Caching**: Browser caches static assets automatically

### Monitoring Performance

```bash
# In browser console (F12)
performance.measure()
performance.getEntriesByType('measure')

# React DevTools addon (install from Chrome Web Store)
# Shows component render times
```

## Summary

| Part | Command | Runs On | Backend Required |
|------|---------|---------|------------------|
| Priority Logic | `node priority_inbox/priorityInbox.js` | CLI | No (sample data) |
| React Frontend | `npm start` (in notification_app_fe) | http://localhost:3000 | Yes (for live data) |

**Expected Time**:
- Priority logic demo: < 1 second
- React frontend startup: ~5-10 seconds
- First data load: ~1-2 seconds

---

**Last Updated**: May 2, 2026  
**Tested**: ✅ Node v16+, npm v8+
