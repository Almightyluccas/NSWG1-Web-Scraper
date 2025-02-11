import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../../config/config';

export class DbConnectionManager {
    private static instance: DbConnectionManager;
    private pool: mysql.Pool;

    private constructor(config: DatabaseConfig) {
        this.pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectionLimit: 1,
            waitForConnections: true,
            queueLimit: 0
        });
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

    public async getConnection(): Promise<mysql.PoolConnection> {
        try {
            return await this.pool.getConnection();
        } catch (error: any) {
            throw new Error(`Failed to connect to database: ${error.message}`);
        }
    }

    public getPool(): mysql.Pool {
        return this.pool;
    }

    public async end(): Promise<void> {
        try {
            await this.pool.end();
        } catch (error: any) {
            console.error('Error closing database pool:', error);
            throw error;
        }
    }
}