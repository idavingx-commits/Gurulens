declare module "pg" {
  export class Client {
    constructor(config: { connectionString: string });
    connect(): Promise<void>;
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
    end(): Promise<void>;
  }
}
