import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../../config/config';

export class DbConnectionManager {
    private pool: mysql.Pool;

    constructor(config: DatabaseConfig) {
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

    public async getConnection(): Promise<mysql.PoolConnection> {
        try {
            return await this.pool.getConnection();
        } catch (error: any) {
            throw new Error(`Failed to connect to database: ${error.message}`);
        }
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