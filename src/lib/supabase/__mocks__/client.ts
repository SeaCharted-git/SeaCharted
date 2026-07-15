/**
 * Jest manual mock for the supabase client.
 * Tests set the next response via `__setNextResponse` before invoking the code
 * under test, then inspect `__lastCall` afterwards.
 *
 * The mock's builder methods are chainable and terminal calls (`.single()`,
 * `.maybeSingle()`, `await`) all resolve to `{ data, error }` = the queued response.
 * `insert/upsert/update/delete/select/eq/in/limit/order/...` return the same
 * builder so chains work.
 */

type Response<T = unknown> = { data: T; error: unknown; count?: number | null };

interface CallRecord {
  table: string;
  ops: Array<{ op: string; args: unknown[] }>;
}

const state = {
  nextResponses: [] as Response[],
  lastCall: null as CallRecord | null,
  allCalls: [] as CallRecord[],
};

export function __setNextResponse(res: Response): void {
  state.nextResponses.push(res);
}

export function __setResponses(...res: Response[]): void {
  state.nextResponses.push(...res);
}

export function __reset(): void {
  state.nextResponses = [];
  state.lastCall = null;
  state.allCalls = [];
}

export function __getLastCall(): CallRecord | null {
  return state.lastCall;
}

export function __getAllCalls(): CallRecord[] {
  return [...state.allCalls];
}

function nextResponse(): Response {
  return state.nextResponses.shift() ?? { data: null, error: null };
}

function makeBuilder(table: string): any {
  const record: CallRecord = { table, ops: [] };
  state.lastCall = record;
  state.allCalls.push(record);

  const push = (op: string) =>
    function (...args: unknown[]) {
      record.ops.push({ op, args });
      return builder;
    };

  const builder: any = {
    select: push('select'),
    insert: push('insert'),
    upsert: push('upsert'),
    update: push('update'),
    delete: push('delete'),
    eq: push('eq'),
    neq: push('neq'),
    gt: push('gt'),
    lt: push('lt'),
    in: push('in'),
    is: push('is'),
    order: push('order'),
    limit: push('limit'),
    range: push('range'),
    match: push('match'),
    single() {
      record.ops.push({ op: 'single', args: [] });
      return Promise.resolve(nextResponse());
    },
    maybeSingle() {
      record.ops.push({ op: 'maybeSingle', args: [] });
      return Promise.resolve(nextResponse());
    },
    then(onFulfilled: (v: Response) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(nextResponse()).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

export const supabase = {
  from(table: string) {
    return makeBuilder(table);
  },
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    signInWithOtp: jest.fn(async () => ({ data: {}, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(async () => ({ data: { path: 'mock/path' }, error: null })),
      remove: jest.fn(async () => ({ data: null, error: null })),
      createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'mock://signed' }, error: null })),
    })),
  },
};
