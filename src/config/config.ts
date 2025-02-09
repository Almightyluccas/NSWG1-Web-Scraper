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

export interface Config {
    database: DatabaseConfig;
    encryption: EncryptionConfig;
    refreshInterval: number;
    username: string;
    password: string;
}

export function loadConfig(): Config {
    const envPath = path.resolve(process.cwd(), '.env');
    console.log('Current working directory:', process.cwd());
    console.log('Looking for .env file at:', envPath);

    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
        console.error('Error loading .env file:', result.error);
        throw result.error;
    }

    console.log('Loaded environment variables:', {
        DB_HOST: process.env.DB_HOST ? 'set' : 'not set',
        DB_PORT: process.env.DB_PORT ? 'set' : 'not set',
        DB_USER: process.env.DB_USER ? 'set' : 'not set',
        DB_NAME: process.env.DB_NAME ? 'set' : 'not set',
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'set' : 'not set',
        ENCRYPTION_IV: process.env.ENCRYPTION_IV ? 'set' : 'not set',
    });

    const requiredEnvVars = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'ENCRYPTION_KEY',
        'ENCRYPTION_IV',
        'HH_USERNAME',
        'HH_PASSWORD'
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
        refreshInterval: 45000,
        username: process.env.HH_USERNAME!,
        password: process.env.HH_PASSWORD!
    };
}