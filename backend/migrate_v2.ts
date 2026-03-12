import dotenv from 'dotenv';
dotenv.config();

import { query } from './src/config/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, '../database/migrate_v2.sql'), 'utf8');
    console.log('📦 Running migration v2...');
    try {
        // Run each statement individually to handle errors gracefully
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 3 && !s.startsWith('--'));

        for (const stmt of statements) {
            try {
                await query(stmt);
                console.log(`  ✅ ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
            } catch (e: any) {
                // Ignore "already exists" type errors
                if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
                    console.log(`  ⏭️  Skipped (already exists): ${stmt.substring(0, 60)}...`);
                } else {
                    console.error(`  ❌ Error: ${e.message}`);
                }
            }
        }
        console.log('✅ Migration v2 complete!');
    } catch (e) {
        console.error('Migration failed:', e);
    }
    process.exit(0);
}

migrate();
