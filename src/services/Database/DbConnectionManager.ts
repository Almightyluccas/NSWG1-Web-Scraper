import { Pool } from 'pg';
import { DatabaseConfig } from '../../config/config';

export class DbConnectionManager {
    private static instance: DbConnectionManager;
    private pool: Pool | null = null;
    private isConnecting: boolean = false;
    private connectionRetries: number = 0;
    private readonly MAX_RETRIES = 5;
    private readonly IDLE_TIMEOUT_MS = 30000;
    private lastUsedTime: number = 0;
    private idleCheckInterval: NodeJS.Timeout | null = null;

    private constructor(private config: DatabaseConfig) {
        this.startIdleCheck();
    }

    private startIdleCheck() {
        this.idleCheckInterval = setInterval(() => {
            this.checkIdleConnection();
        }, 10000);
    }

    private async checkIdleConnection() {
        if (!this.pool) return;
        
        const idleTime = Date.now() - this.lastUsedTime;
        if (idleTime >= this.IDLE_TIMEOUT_MS) {
            console.log('Closing idle database connection pool');
            await this.end();
        }
    }

    public static getInstance(config?: DatabaseConfig): DbConnectionManager {
        if (!DbConnectionManager.instance) {
            if (!config) {
                throw new Error('Configuration required for initial DbConnectionManager setup');
            }
            DbConnectionManager.instance = new DbConnectionManager(config);
        }
        return DbConnectionManager.instance;
    }

    public static destroyInstance(): void {
        if (DbConnectionManager.instance) {
            DbConnectionManager.instance.end().catch(console.error);
            DbConnectionManager.instance = null as any;
        }
    }

    private async createConnection(): Promise<Pool> {
        try {
            this.isConnecting = true;
            const pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            // Test the connection
            await pool.query('SELECT 1');
            
            pool.on('error', (err: Error) => {
                console.error('Unexpected error on idle client', err);
            });

            this.connectionRetries = 0;
            this.lastUsedTime = Date.now();
            return pool;
        } catch (error: any) {
            this.connectionRetries++;
            if (this.connectionRetries < this.MAX_RETRIES) {
                console.log(`Retrying connection (attempt ${this.connectionRetries}/${this.MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * this.connectionRetries));
                return this.createConnection();
            }
            throw new Error(`Failed to connect to database after ${this.MAX_RETRIES} attempts: ${error.message}`);
        } finally {
            this.isConnecting = false;
        }
    }

    private async isConnectionValid(): Promise<boolean> {
        if (!this.pool) return false;
        try {
            await this.pool.query('SELECT 1');
            this.lastUsedTime = Date.now();
            return true;
        } catch (error) {
            console.log('Connection validation failed, will create new connection');
            this.pool = null;
            return false;
        }
    }

    public async getConnection(): Promise<Pool> {
        if (this.isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getConnection();
        }

        if (this.pool) {
            const isValid = await this.isConnectionValid();
            if (isValid) {
                this.lastUsedTime = Date.now();
                return this.pool;
            }
        }

        this.pool = await this.createConnection();
        return this.pool;
    }

    public async end(): Promise<void> {
        try {
            if (this.idleCheckInterval) {
                clearInterval(this.idleCheckInterval);
                this.idleCheckInterval = null;
            }
            if (this.pool) {
                console.log('Closing database connection pool...');
                await this.pool.end();
                this.pool = null;
                console.log('Database connection pool closed successfully');
            }
        } catch (error: any) {
            console.error('Error closing database connection:', error);
            throw error;
        }
    }
}