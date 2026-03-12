import { query } from './src/config/db';
import * as fs from 'fs';

async function checkTables() {
    try {
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const res = await query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('Course', 'Module', 'Lesson', 'courses', 'modules', 'lessons')
        `);

        fs.writeFileSync('db_schema.json', JSON.stringify({
            tables: tables.rows.map(r => r.table_name),
            columns: res.rows
        }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkTables();
