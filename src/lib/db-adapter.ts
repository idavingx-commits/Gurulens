import { PrismaNeon, PrismaNeonHTTP } from "@prisma/adapter-neon";
import type {
  IsolationLevel,
  SqlDriverAdapter,
  SqlDriverAdapterFactory,
  SqlQuery,
  SqlResultSet,
  Transaction,
} from "@prisma/driver-adapter-utils";

/**
 * Neon adapter tuned for Cloudflare Workers.
 *
 * Ordinary queries use Neon's stateless HTTP driver. HTTP requests do not hold
 * a socket between queries, so the Prisma client can safely live at module
 * scope without leaking I/O objects across Worker requests.
 *
 * Transactions need a session, so each one opens a short-lived WebSocket pool,
 * runs the transaction, and closes the pool in `commit`/`rollback`. The pool is
 * never reused by another request.
 */
class HybridNeonAdapterFactory implements SqlDriverAdapterFactory {
  readonly provider = "postgres";
  readonly adapterName = "neon-http-with-ws-transactions";

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<SqlDriverAdapter> {
    const http = await new PrismaNeonHTTP(this.connectionString, {}).connect();
    const wsFactory = new PrismaNeon({
      connectionString: this.connectionString,
      max: 1,
    });

    return {
      provider: http.provider,
      adapterName: http.adapterName,
      queryRaw: (query: SqlQuery): Promise<SqlResultSet> => http.queryRaw(query),
      executeRaw: (query: SqlQuery): Promise<number> => http.executeRaw(query),
      executeScript: (script: string): Promise<void> => http.executeScript(script),
      getConnectionInfo: http.getConnectionInfo?.bind(http),
      dispose: () => http.dispose(),
      startTransaction: async (isolationLevel?: IsolationLevel): Promise<Transaction> => {
        const ws = await wsFactory.connect();
        try {
          const transaction = await ws.startTransaction(isolationLevel);
          return new DisposableTransaction(transaction, ws);
        } catch (error) {
          await ws.dispose().catch(() => {});
          throw error;
        }
      },
    };
  }
}

/** Wraps an adapter transaction so its WebSocket pool is always closed. */
class DisposableTransaction implements Transaction {
  readonly provider: Transaction["provider"];
  readonly adapterName: Transaction["adapterName"];
  readonly options: { usePhantomQuery: boolean };

  constructor(
    private readonly transaction: Transaction & {
      options?: { usePhantomQuery: boolean };
    },
    private readonly adapter: SqlDriverAdapter,
  ) {
    this.provider = transaction.provider;
    this.adapterName = transaction.adapterName;
    // Prisma's transaction manager reads this flag off the transaction object.
    this.options = transaction.options ?? { usePhantomQuery: false };
  }

  queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    return this.transaction.queryRaw(query);
  }

  executeRaw(query: SqlQuery): Promise<number> {
    return this.transaction.executeRaw(query);
  }

  async commit(): Promise<void> {
    try {
      await this.transaction.commit();
    } finally {
      await this.adapter.dispose();
    }
  }

  async rollback(): Promise<void> {
    try {
      await this.transaction.rollback();
    } finally {
      await this.adapter.dispose();
    }
  }
}

export function neonAdapter(connectionString: string): SqlDriverAdapterFactory {
  return new HybridNeonAdapterFactory(connectionString);
}
