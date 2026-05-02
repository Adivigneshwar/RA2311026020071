import fs from 'fs';
import path from 'path';
import { Log } from '../logging_middleware/logger';


interface Notification {
  id: string;
  type: 'Placement' | 'Result' | 'Event';
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

interface FetchAndGetTopNOptions {
  fetchImpl?: typeof fetch;
  limit?: number;
  baseUrl?: string;
}

interface FetchResponse extends Response {
  json(): Promise<Notification[] | Record<string, unknown>>;
}


const TYPE_PRIORITY: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function ensureFetch(): void {
  if (typeof fetch === 'undefined') {
    (global as unknown as Record<string, unknown>).fetch = (...args: unknown[]) =>
      import('node-fetch').then(({ default: nodeFetch }: Record<string, unknown>) =>
        (nodeFetch as typeof fetch)(...(args as Parameters<typeof fetch>))
      );
  }
}


type CompareFn<T> = (a: T, b: T) => number;


export function topNByPriority(notifications: Notification[], N: number = 10): Notification[] {
  const sorted: Notification[] = notifications.slice().sort((a, b) => {
    const pa: number = TYPE_PRIORITY[a.type] || 0;
    const pb: number = TYPE_PRIORITY[b.type] || 0;
    if (pa !== pb) return pb - pa; 
    
    const ta: number = new Date(a.timestamp).getTime();
    const tb: number = new Date(b.timestamp).getTime();
    return tb - ta; 
  });
  return sorted.slice(0, N);
}


class MinHeap<T> {
  private _arr: T[];
  private _cmp: CompareFn<T>;

  constructor(compare: CompareFn<T>) {
    this._arr = [];
    this._cmp = compare;
  }

  size(): number {
    return this._arr.length;
  }

  peek(): T | undefined {
    return this._arr[0];
  }

  push(item: T): void {
    this._arr.push(item);
    this._siftUp(this._arr.length - 1);
  }

  pop(): T | undefined {
    const top: T | undefined = this._arr[0];
    const last: T | undefined = this._arr.pop();
    if (this._arr.length > 0 && last !== undefined) {
      this._arr[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  private _siftUp(idx: number): void {
    const a: T[] = this._arr;
    while (idx > 0) {
      const p: number = Math.floor((idx - 1) / 2);
      if (this._cmp(a[idx], a[p]) >= 0) break;
      [a[idx], a[p]] = [a[p], a[idx]];
      idx = p;
    }
  }

  private _siftDown(idx: number): void {
    const a: T[] = this._arr;
    const n: number = a.length;
    while (true) {
      let smallest: number = idx;
      const l: number = idx * 2 + 1;
      const r: number = idx * 2 + 2;
      if (l < n && this._cmp(a[l], a[smallest]) < 0) smallest = l;
      if (r < n && this._cmp(a[r], a[smallest]) < 0) smallest = r;
      if (smallest === idx) break;
      [a[idx], a[smallest]] = [a[smallest], a[idx]];
      idx = smallest;
    }
  }
}

export function topNByHeap(notifications: Notification[], N: number = 10): Notification[] {
  const cmp = (x: Notification, y: Notification): number => {
    const px: number = TYPE_PRIORITY[x.type] || 0;
    const py: number = TYPE_PRIORITY[y.type] || 0;
    if (px !== py) return px - py; 
    const tx: number = new Date(x.timestamp).getTime();
    const ty: number = new Date(y.timestamp).getTime();
    return tx - ty; 
  };

  const heap: MinHeap<Notification> = new MinHeap(cmp);
  for (const n of notifications) {
    if (heap.size() < N) {
      heap.push(n);
      continue;
    }
    const root: Notification | undefined = heap.peek();
    if (root && cmp(n, root) > 0) {
      heap.pop();
      heap.push(n);
    }
  }
  
  const arr: Notification[] = [];
  let item: Notification | undefined;
  while ((item = heap.pop()) !== undefined) {
    arr.push(item);
  }
  
  arr.reverse();
  return arr.sort((a, b) => {
    const pa: number = TYPE_PRIORITY[a.type] || 0;
    const pb: number = TYPE_PRIORITY[b.type] || 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}


export async function fetchAndGetTopN(options: FetchAndGetTopNOptions = {}): Promise<Notification[]> {
  ensureFetch();
  const fetchImpl: typeof fetch = options.fetchImpl || fetch;
  const limit: number = options.limit || 10;
  const baseUrl: string = options.baseUrl || '';

  try {
    await Log('frontend', 'info', 'api', 'Fetching notifications from API', {
      url: `${baseUrl}/evaluation-service/notifications`,
    });
  } catch (e) {
    
  }

  let res: FetchResponse;
  try {
    res = (await fetchImpl(`${baseUrl}/evaluation-service/notifications`)) as FetchResponse;
  } catch (err) {
    const errorMessage: string = err instanceof Error ? err.message : String(err);
    try {
      await Log('frontend', 'error', 'api', 'Network error while fetching notifications', {
        error: errorMessage,
      });
    } catch (logErr) {
      
    }
    throw err;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    try {
      await Log('frontend', 'error', 'api', 'Invalid JSON from notifications API', {
        status: res.status,
      });
    } catch (logErr) {
      
    }
    throw new Error('Invalid JSON from notifications API');
  }

  
  if (!Array.isArray(data)) {
    try {
      await Log('frontend', 'warn', 'api', 'Notifications API returned non-array', {
        type: typeof data,
      });
    } catch (logErr) {
      
    }
    throw new Error('Notifications API returned unexpected payload');
  }

  
  const useHeap: boolean = data.length > 1000;
  const top: Notification[] = useHeap ? topNByHeap(data as Notification[], limit) : topNByPriority(data as Notification[], limit);

  try {
    await Log('frontend', 'info', 'component', `Computed top ${top.length} notifications`, {
      method: useHeap ? 'heap' : 'sort',
    });
  } catch (logErr) {
    
  }
  return top;
}


if (process.argv && process.argv[1] && path.basename(process.argv[1]) === 'priorityInbox.ts') {
  (async (): Promise<void> => {
    try {
      const filePath: string = path.resolve(process.cwd(), 'sample_notifications.json');
      if (fs.existsSync(filePath)) {
        const payload: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const top: Notification[] = topNByHeap(payload as Notification[], 10);
        process.stdout.write(`${JSON.stringify(top, null, 2)}\n`);
      } else {
        process.stdout.write('No sample_notifications.json found. Please provide sample data for CLI demo.\n');
      }
    } catch (err) {
      const errorMessage: string = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error running priority demo: ${errorMessage}\n`);
    }
  })();
}
