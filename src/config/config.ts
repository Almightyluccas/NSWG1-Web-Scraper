import dotenv from 'dotenv';
import path from 'path';

export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface EncryptionConfig {
    key: string;
    iv: string;
}

export interface ApiConfig {
    apiKey: string;
    serverStatusApiUrl: string;
}

export interface Config {
    database: DatabaseConfig;
    encryption: EncryptionConfig;
    refreshInterval: number;
    username: string;
    password: string;
    api: ApiConfig;
}

export function loadConfig(): Config {
    if (process.env.NODE_ENV !== 'production') {
        const envPath = path.resolve(process.cwd(), '.env');
        dotenv.config({ path: envPath });
    }

    const requiredEnvVars = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'ENCRYPTION_KEY',
        'ENCRYPTION_IV',
        'HH_USERNAME',
        'HH_PASSWORD',
        'API_KEY',
        'SERVER_STATUS_API_URL',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    return {
        database: {
            host: process.env.DB_HOST!,
            port: parseInt(process.env.DB_PORT!, 10),
            user: process.env.DB_USER!,
            password: process.env.DB_PASSWORD!,
            database: process.env.DB_NAME!
        },
        encryption: {
            key: process.env.ENCRYPTION_KEY!,
            iv: process.env.ENCRYPTION_IV!
        },
        refreshInterval: 60000,
        username: process.env.HH_USERNAME!,
        password: process.env.HH_PASSWORD!,
        api: {
            apiKey: process.env.API_KEY!,
            serverStatusApiUrl: process.env.SERVER_STATUS_API_URL!,
        }
    };
}