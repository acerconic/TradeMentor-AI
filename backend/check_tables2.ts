import { query } from './src/config/db';
import * as fs from 'fs';

async function checkTables() {
    try {
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tables = res.rows.map(r => r.table_name);

        let usersSchema = [];
        let coursesSchema = [];

        try {
            const u = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`);
            usersSchema = u.rows;
        } catch (e) { }

        try {
            const c = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'courses'`);
            coursesSchema = c.rows;
        } catch (e) { }

        const data = {
            tables,
            usersSchema,
            coursesSchema
        };
        fs.writeFileSync('db_out.json', JSON.stringify(data, null, 2), 'utf8');
        console.log("Written to db_out.json");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkTables();
