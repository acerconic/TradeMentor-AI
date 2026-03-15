import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { FastifyBaseLogger } from 'fastify';

type PdfRenderTools = {
    pdfjs: any;
    createCanvas: (width: number, height: number) => any;
    standardFontDataUrl?: string;
};

let renderToolsPromise: Promise<PdfRenderTools> | null = null;

function resolveGeneratedPagesRoot(): string {
    const candidates = [
        path.resolve(process.cwd(), '..', 'data', 'generated', 'lesson-pages'),
        path.resolve(process.cwd(), 'data', 'generated', 'lesson-pages'),
        path.resolve(__dirname, '..', '..', '..', 'data', 'generated', 'lesson-pages'),
        '/opt/render/project/src/data/generated/lesson-pages',
    ];

    const preferred = candidates[0];
    fs.mkdirSync(preferred, { recursive: true });
    return preferred;
}

const GENERATED_PAGES_ROOT = resolveGeneratedPagesRoot();

function buildPdfAssetKey(filePath: string): string {
    const normalized = path.resolve(String(filePath || '').trim());
    return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 24);
}

function buildPageFileName(pageNumber: number): string {
    return `page-${String(Math.max(1, pageNumber)).padStart(4, '0')}.jpg`;
}

async function loadRenderTools(): Promise<PdfRenderTools> {
    if (!renderToolsPromise) {
        renderToolsPromise = (async () => {
            const canvasModule: any = await import('@napi-rs/canvas');
            if (!(globalThis as any).DOMMatrix) (globalThis as any).DOMMatrix = canvasModule.DOMMatrix;
            if (!(globalThis as any).ImageData) (globalThis as any).ImageData = canvasModule.ImageData;
            if (!(globalThis as any).Path2D) (globalThis as any).Path2D = canvasModule.Path2D;

            const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const packageJsonPath = require.resolve('pdfjs-dist/package.json');
            const packageDir = path.dirname(packageJsonPath);
            const standardFontDir = path.join(packageDir, 'standard_fonts');

            return {
                pdfjs,
                createCanvas: canvasModule.createCanvas,
                standardFontDataUrl: fs.existsSync(standardFontDir)
                    ? pathToFileURL(`${standardFontDir}${path.sep}`).toString()
                    : undefined,
            };
        })();
    }

    return renderToolsPromise;
}

class NodeCanvasFactory {
    private readonly createCanvasFn: (width: number, height: number) => any;

    constructor(createCanvasFn: (width: number, height: number) => any) {
        this.createCanvasFn = createCanvasFn;
    }

    create(width: number, height: number) {
        const safeWidth = Math.max(1, Math.ceil(width));
        const safeHeight = Math.max(1, Math.ceil(height));
        const canvas = this.createCanvasFn(safeWidth, safeHeight);
        const context = canvas.getContext('2d');
        return { canvas, context };
    }

    reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
        canvasAndContext.canvas.width = Math.max(1, Math.ceil(width));
        canvasAndContext.canvas.height = Math.max(1, Math.ceil(height));
    }

    destroy(canvasAndContext: { canvas: any; context: any }) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

export function getGeneratedPageImageAbsolutePath(filePath: string, pageNumber: number): string {
    const key = buildPdfAssetKey(filePath);
    return path.join(GENERATED_PAGES_ROOT, key, buildPageFileName(pageNumber));
}

export function getGeneratedPageImageRoute(lessonId: string, pageNumber: number): string {
    return `/courses/lessons/${lessonId}/pages/${Math.max(1, pageNumber)}/image`;
}

export async function renderPdfPagesToImages(
    filePath: string,
    requestedPages?: number[],
    log?: FastifyBaseLogger,
): Promise<{ totalPages: number; renderedPages: number[]; imagePathsByPage: Record<number, string> }> {
    const absoluteFilePath = path.resolve(String(filePath || '').trim());
    if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
        throw new Error('PDF file not found for page rendering');
    }

    const { pdfjs, createCanvas, standardFontDataUrl } = await loadRenderTools();
    const outputDir = path.dirname(getGeneratedPageImageAbsolutePath(absoluteFilePath, 1));
    fs.mkdirSync(outputDir, { recursive: true });

    const pdfBuffer = fs.readFileSync(absoluteFilePath);
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        disableWorker: true,
        useSystemFonts: true,
        standardFontDataUrl,
    });

    const pdfDocument = await loadingTask.promise;
    const totalPages = Math.max(1, Number(pdfDocument?.numPages || 1));
    const uniquePages = Array.from(
        new Set(
            (Array.isArray(requestedPages) && requestedPages.length > 0
                ? requestedPages
                : Array.from({ length: totalPages }, (_, index) => index + 1)
            )
                .map((page) => Math.max(1, Math.min(totalPages, Number(page) || 1)))
        )
    ).sort((a, b) => a - b);

    const imagePathsByPage: Record<number, string> = {};
    const renderedPages: number[] = [];
    const canvasFactory = new NodeCanvasFactory(createCanvas);

    for (const pageNumber of uniquePages) {
        const imagePath = getGeneratedPageImageAbsolutePath(absoluteFilePath, pageNumber);
        imagePathsByPage[pageNumber] = imagePath;

        if (fs.existsSync(imagePath)) continue;

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.7 });
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

        try {
            await page.render({
                canvasContext: canvasAndContext.context,
                viewport,
                canvasFactory,
            }).promise;

            const jpegBuffer = canvasAndContext.canvas.toBuffer('image/jpeg', 88);
            fs.writeFileSync(imagePath, jpegBuffer);
            renderedPages.push(pageNumber);
        } finally {
            canvasFactory.destroy(canvasAndContext);
        }
    }

    try {
        await loadingTask.destroy();
    } catch {
        // ignore PDF.js cleanup issues
    }

    if (log && renderedPages.length > 0) {
        log.info(`[PDF Pages] Rendered ${renderedPages.length} page images for ${path.basename(absoluteFilePath)}`);
    }

    return { totalPages, renderedPages, imagePathsByPage };
}

export async function ensurePdfPageImage(filePath: string, pageNumber: number, log?: FastifyBaseLogger): Promise<string> {
    const imagePath = getGeneratedPageImageAbsolutePath(filePath, pageNumber);
    if (fs.existsSync(imagePath)) return imagePath;

    await renderPdfPagesToImages(filePath, [pageNumber], log);

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Failed to generate image for PDF page ${pageNumber}`);
    }

    return imagePath;
}
