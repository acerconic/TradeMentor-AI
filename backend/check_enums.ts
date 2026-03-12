import { query } from './src/config/db';

async function verifyLanguageAndLevel() {
    try {
        const langRes = await query(`
            SELECT pg_type.typname, pg_enum.enumlabel
            FROM pg_type
            JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = 'Language' OR pg_type.typname = 'language'
        `);
        console.log("Language ENUM:", langRes.rows);

        const levelRes = await query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'Course' AND column_name = 'level'
        `);
        if (levelRes.rowCount === 0) {
            console.log("Level column is missing in Course");
            await query(`ALTER TABLE "Course" ADD COLUMN level text DEFAULT 'ALL'`);
            console.log("Added 'level' column to Course");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
verifyLanguageAndLevel();
