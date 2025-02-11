import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../../config/config';

export class DbConnectionManager {
    private static instance: DbConnectionManager;
    private connection: mysql.Connection | null = null;
    private isConnecting: boolean = false;
    private connectionRetries: number = 0;
    private readonly MAX_RETRIES = 5;

    private constructor(private config: DatabaseConfig) {}

    public static getInstance(config?: DatabaseConfig): DbConnectionManager {
        if (!DbConnectionManager.instance) {
            if (!config) {
                throw new Error('Configuration required for initial DbConnectionManager setup');
            }
            DbConnectionManager.instance = new DbConnectionManager(config);
        }
        return DbConnectionManager.instance;
    }

    private async createConnection(): Promise<mysql.Connection> {
        try {
            this.isConnecting = true;
            const connection = await mysql.createConnection({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database
            });

            connection.on('error', async (err) => {
                console.error('Database connection error:', err);
                if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
                    err.code === 'ECONNRESET' ||
                    err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
                    this.connection = null;
                    this.connectionRetries = 0;
                    await this.getConnection();
                } else {
                    throw err;
                }
            });

            this.connectionRetries = 0;
            return connection;
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
        if (!this.connection) return false;
        try {
            await this.connection.query('SELECT 1');
            return true;
        } catch (error) {
            console.log('Connection validation failed, will create new connection');
            this.connection = null;
            return false;
        }
    }

    public async getConnection(): Promise<mysql.Connection> {
        if (this.isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getConnection();
        }

        if (this.connection) {
            const isValid = await this.isConnectionValid();
            if (isValid) {
                return this.connection;
            }
        }

        this.connection = await this.createConnection();
        return this.connection;
    }

    public async end(): Promise<void> {
        try {
            if (this.connection) {
                await this.connection.end();
                this.connection = null;
            }
        } catch (error: any) {
            console.error('Error closing database connection:', error);
            throw error;
        }
    }
}