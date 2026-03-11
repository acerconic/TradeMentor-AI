import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const LIBRARY_PATH = path.join(process.cwd(), '..', 'data', 'library');

export async function getLibraryContext(query: string) {
    try {
        if (!fs.existsSync(LIBRARY_PATH)) return "";

        const files = fs.readdirSync(LIBRARY_PATH).filter(f => f.endsWith('.pdf'));
        let combinedText = "";

        // Читаем первые 2-3 книги для контекста (ограничение по размеру токенов)
        for (const file of files.slice(0, 3)) {
            const dataBuffer = fs.readFileSync(path.join(LIBRARY_PATH, file));
            const data = await pdf(dataBuffer);
            // Берем только часть текста, чтобы не перегружать LLM
            combinedText += `\n--- SOURCE: ${file} ---\n${data.text.substring(0, 3000)}\n`;
        }

        return combinedText;
    } catch (e) {
        console.error("Library parse error:", e);
        return "";
    }
}
