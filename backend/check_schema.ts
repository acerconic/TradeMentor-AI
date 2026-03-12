import { query } from './src/config/db';
import * as fs from 'fs';

async function checkTables() {
    let out = {};
    try {
        const c = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Course'`);
        out['Course'] = c.rows;

        const m = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Module'`);
        out['Module'] = m.rows;

        const l = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Lesson'`);
        out['Lesson'] = l.rows;
    } catch (e) {
        console.error(e);
    }
    fs.writeFileSync('db_out_schema.json', JSON.stringify(out, null, 2), 'utf8');
    process.exit(0);
}
checkTables();
