import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
})

// Test the connection on startup
pool.on('connect', () => {
    console.log('[DB] PostgreSQL connected ✓')
})

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err)
})

export const query = (text: string, params?: any[]) => pool.query(text, params)
