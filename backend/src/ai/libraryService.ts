import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const LIBRARY_PATH = path.join(process.cwd(), '..', 'data', 'library');

export async function getLibraryContext(query: string) {
    try {
        if (!fs.existsSync(LIBRARY_PATH)) return "";

        const files = fs.readdirSync(LIBRARY_PATH).filter(f => f.endsWith('.pdf'));
        let combinedText = "";

        // Читаем первые 3 книги для контекста
        for (const file of files.slice(0, 3)) {
            try {
                const dataBuffer = fs.readFileSync(path.join(LIBRARY_PATH, file));
                // Исправляем вызов pdf-parse для разных сред (CommonJS/ESM)
                const pdfParser = typeof pdf === 'function' ? pdf : pdf.default;

                if (typeof pdfParser === 'function') {
                    const data = await pdfParser(dataBuffer);
                    combinedText += `\n--- SOURCE: ${file} ---\n${data.text.substring(0, 3000)}\n`;
                }
            } catch (err) {
                console.warn(`Could not parse ${file}, skipping...`);
            }
        }

        return combinedText;
    } catch (e) {
        console.error("Library parse fatal error:", e);
        return "";
    }
}
