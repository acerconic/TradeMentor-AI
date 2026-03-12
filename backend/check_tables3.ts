import { query } from './src/config/db';
import * as fs from 'fs';

async function checkTables() {
    let out = {};
    try {
        const u = await query(`SELECT * FROM users LIMIT 1`);
        out['users'] = "success";
    } catch (e) {
        out['users'] = e.message;
    }

    try {
        const c = await query(`SELECT * FROM "Course" LIMIT 1`);
        out['Course'] = "success";
    } catch (e) {
        out['Course'] = e.message;
    }

    try {
        const c2 = await query(`SELECT * FROM courses LIMIT 1`);
        out['courses'] = "success";
    } catch (e) {
        out['courses'] = e.message;
    }

    try {
        const c3 = await query(`SELECT * FROM "User" LIMIT 1`);
        out['User'] = "success";
    } catch (e) {
        out['User'] = e.message;
    }

    fs.writeFileSync('db_out_3.json', JSON.stringify(out, null, 2), 'utf8');
    process.exit(0);
}
checkTables();
