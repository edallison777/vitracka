/**
 * Database Connection Management
 * Implements connection pooling for PostgreSQL database
 */

import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

class DatabaseConnection {
    private pool: Pool;
    private static instance: DatabaseConnection;

    private constructor() {
        const config: DatabaseConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'vitracka',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.DB_SSL === 'true',
            max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of connections
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // 2 seconds
        };

        this.pool = new Pool(config);

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });

        // Handle pool connection events
        this.pool.on('connect', () => {
            console.log('Database connection established');
        });

        this.pool.on('remove', () => {
            console.log('Database connection removed from pool');
        });
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    public getPool(): Pool {
        return this.pool;
    }

    public async query(text: string, params?: any[]): Promise<any> {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: result.rowCount });
            return result;
        } catch (error) {
            console.error('Database query error', { text, error });
            throw error;
        }
    }

    public async getClient() {
        return await this.pool.connect();
    }

    public async close(): Promise<void> {
        await this.pool.end();
        console.log('Database connection pool closed');
    }

    public async testConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT NOW()');
            console.log('Database connection test successful:', result.rows[0]);
            return true;
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }
}

export default DatabaseConnection;