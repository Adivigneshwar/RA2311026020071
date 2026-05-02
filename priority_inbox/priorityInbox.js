import fs from 'fs';
import path from 'path';
import { Log } from '../logging_middleware/logger.js';

// Priority mapping: higher number = higher priority
const TYPE_PRIORITY = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function ensureFetch() {
  if (typeof fetch === 'undefined') {
    global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
  }
}

// Simple top-N using sorting approach. Accepts array of notifications and returns top N.
export function topNByPriority(notifications, N = 10) {
  const sorted = notifications.slice().sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] || 0;
    const pb = TYPE_PRIORITY[b.type] || 0;
    if (pa !== pb) return pb - pa; // higher priority first
    // compare timestamps (ISO strings)
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return tb - ta; // newer first
  });
  return sorted.slice(0, N);
}

// Streaming approach using a fixed-size min-heap (for efficiency when notifications are many)
class MinHeap {
  constructor(compare) {
    this._arr = [];
    this._cmp = compare;
  }
  size() { return this._arr.length; }
  peek() { return this._arr[0]; }
  push(item) {
    this._arr.push(item);
    this._siftUp(this._arr.length - 1);
  }
  pop() {
    const top = this._arr[0];
    const last = this._arr.pop();
    if (this._arr.length > 0) {
      this._arr[0] = last;
      this._siftDown(0);
    }
    return top;
  }
  _siftUp(idx) {
    const a = this._arr;
    while (idx > 0) {
      const p = Math.floor((idx - 1) / 2);
      if (this._cmp(a[idx], a[p]) >= 0) break;
      [a[idx], a[p]] = [a[p], a[idx]];
      idx = p;
    }
  }
  _siftDown(idx) {
    const a = this._arr;
    const n = a.length;
    while (true) {
      let smallest = idx;
      const l = idx * 2 + 1;
      const r = idx * 2 + 2;
      if (l < n && this._cmp(a[l], a[smallest]) < 0) smallest = l;
      if (r < n && this._cmp(a[r], a[smallest]) < 0) smallest = r;
      if (smallest === idx) break;
      [a[idx], a[smallest]] = [a[smallest], a[idx]];
      idx = smallest;
    }
  }
}

export function topNByHeap(notifications, N = 10) {
  const cmp = (x, y) => {
    const px = TYPE_PRIORITY[x.type] || 0;
    const py = TYPE_PRIORITY[y.type] || 0;
    if (px !== py) return px - py; // min-heap: lower priority is "smaller"
    const tx = new Date(x.timestamp).getTime();
    const ty = new Date(y.timestamp).getTime();
    return tx - ty; // older is smaller
  };

  const heap = new MinHeap(cmp);
  for (const n of notifications) {
    if (heap.size() < N) {
      heap.push(n);
      continue;
    }
    const root = heap.peek();
    if (cmp(n, root) > 0) {
      heap.pop();
      heap.push(n);
    }
  }
  // Extract heap content and sort final result by desired ordering
  const arr = [];
  while (heap.size() > 0) arr.push(heap.pop());
  // arr currently is in ascending (lowest priority) order, so reverse and then sort by our rules
  arr.reverse();
  return arr.sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] || 0;
    const pb = TYPE_PRIORITY[b.type] || 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

// Fetch notifications from API and return top N using logging middleware for tracing
export async function fetchAndGetTopN(options = {}) {
  ensureFetch();
  const fetchImpl = options.fetchImpl || fetch;
  const limit = options.limit || 10;
  const baseUrl = options.baseUrl || '';

  try {
    await Log('frontend', 'info', 'api', 'Fetching notifications from API', { url: `${baseUrl}/evaluation-service/notifications` });
  } catch (e) {
    // don't fail if logging fails; continue fetching
  }

  let res;
  try {
    res = await fetchImpl(`${baseUrl}/evaluation-service/notifications`);
  } catch (err) {
    await Log('frontend', 'error', 'api', 'Network error while fetching notifications', { error: err.message });
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    await Log('frontend', 'error', 'api', 'Invalid JSON from notifications API', { status: res.status });
    throw new Error('Invalid JSON from notifications API');
  }

  // Assume API returns an array
  if (!Array.isArray(data)) {
    await Log('frontend', 'warn', 'api', 'Notifications API returned non-array', { type: typeof data });
    throw new Error('Notifications API returned unexpected payload');
  }

  // Use heap approach if dataset is large
  const useHeap = data.length > 1000;
  const top = useHeap ? topNByHeap(data, limit) : topNByPriority(data, limit);

  await Log('frontend', 'info', 'component', `Computed top ${top.length} notifications`, { method: useHeap ? 'heap' : 'sort' });
  return top;
}

// CLI runner for local testing
if (process.argv && process.argv[1] && path.basename(process.argv[1]) === 'priorityInbox.js') {
  (async () => {
    try {
      const filePath = path.resolve(process.cwd(), 'sample_notifications.json');
      if (fs.existsSync(filePath)) {
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const top = topNByHeap(payload, 10);
        process.stdout.write(`${JSON.stringify(top, null, 2)}\n`);
      } else {
        process.stdout.write('No sample_notifications.json found. Please provide sample data for CLI demo.\n');
      }
    } catch (err) {
      process.stderr.write(`Error running priority demo: ${err.message}\n`);
    }
  })();
}
