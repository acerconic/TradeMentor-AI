import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import argon2 from 'argon2'
import z from 'zod'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { ingestPdf, scanLibrary } from '../services/ingestionService'

const CreateUserSchema = z.object({
    name: z.string().min(2),
    role: z.enum(['superadmin', 'student']).default('student'),
})

// Middleware: требует роль superadmin
export const requireSuperadmin = async (request: any, reply: any) => {
    if (request.user?.role !== 'superadmin') {
        return reply.status(403).send({ error: 'Доступ запрещён. Нужна роль superadmin.' })
    }
}

// Генерация сложного пароля
function generatePassword(length = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < length; i++) {
        pass += chars[crypto.randomInt(0, chars.length)]
    }
    return pass
}

export default async function adminRoutes(server: FastifyInstance) {

    // ── POST /admin/create-user ───────────────────────────────
    server.post(
        '/create-user',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                const { name, role } = CreateUserSchema.parse(request.body)

                // Генерируем логин: имя (только буквы, первые 10) + случайные цифры
                const baseName = name.replace(/[^a-zA-Zа-яА-Я]/g, '').slice(0, 10).toLowerCase()
                const randomNum = crypto.randomInt(10000, 99999)
                const generatedLogin = `${baseName}${randomNum}`

                // Генерируем пароль
                const generatedPassword = generatePassword(16)
                const passwordHash = await argon2.hash(generatedPassword)

                // Сохраняем в БД
                const result = await query(
                    `INSERT INTO users (login, password_hash, role, name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, login, name, role, created_at`,
                    [generatedLogin, passwordHash, role, name]
                )

                const newUser = result.rows[0]

                // Аудит
                await query(
                    'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
                    [request.user.id, 'LOGIN', JSON.stringify({ created_user: newUser.id })]
                )

                // Возвращаем логин + пароль ОДИН РАЗ (суперадмин копирует и передаёт студенту)
                return {
                    id: newUser.id,
                    login: newUser.login,
                    password: generatedPassword,   // ⚠️ только один раз
                    name: newUser.name,
                    role: newUser.role,
                    createdAt: newUser.created_at,
                }
            } catch (err) {
                if (err instanceof z.ZodError) {
                    return reply.status(400).send({ error: 'Ошибка валидации', details: err.issues })
                }
                // Нарушение уникальности (login уже существует — крайне редко)
                if ((err as any).code === '23505') {
                    return reply.status(409).send({ error: 'Логин уже занят. Попробуйте ещё раз.' })
                }
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка при создании пользователя' })
            }
        }
    )

    // ── GET /admin/users ──────────────────────────────────────
    server.get(
        '/users',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            const result = await query(
                `SELECT id, login, name, role, onboarding_passed, created_at, last_login
         FROM users
         ORDER BY created_at DESC`
            )
            return result.rows
        }
    )

    // ── GET /admin/logs ───────────────────────────────────────
    server.get(
        '/logs',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            const result = await query(
                `SELECT al.*, u.login as user_login
                 FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id
                 ORDER BY al.created_at DESC
                 LIMIT 200`
            )
            return result.rows
        }
    )

    // ── GET /admin/stats ──────────────────────────────────────
    server.get(
        '/stats',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                // Students count
                const studentsResult = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);
                const totalStudents = studentsResult.rows[0].count;

                // Courses count
                const coursesResult = await query(`SELECT COUNT(*) as count FROM "Course"`);
                const activeCourses = coursesResult.rows[0].count;

                // AI Interactions count
                let aiInteractions = 0;
                try {
                    const aiResult = await query(`SELECT COUNT(*) as count FROM ai_requests`);
                    aiInteractions = aiResult.rows[0].count;
                } catch (e) { /* Ignore if table doesnt exist yet */ }

                return {
                    totalStudents: parseInt(totalStudents) || 0,
                    activeCourses: parseInt(activeCourses) || 0,
                    aiInteractions: parseInt(aiInteractions as any) || 0,
                    systemAlerts: 0 // Dummy or could be based on failed ai_requests
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Failed to fetch stats' })
            }
        }
    )
    // ── POST /admin/import-pdf (Upload + ingest a single PDF) ──────
    server.post(
        '/import-pdf',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                if (!request.isMultipart()) {
                    return reply.status(400).send({ error: 'Multipart request required' });
                }

                const uploadDir = path.resolve(process.cwd(), '..', 'data', 'uploads');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                let filePath = '';
                let originalName = '';

                const parts = request.parts();
                for await (const part of parts) {
                    if (part.type === 'file' && part.mimetype === 'application/pdf') {
                        originalName = part.filename;
                        filePath = path.join(uploadDir, `${Date.now()}_${originalName}`);
                        const buffer = await part.toBuffer();
                        fs.writeFileSync(filePath, buffer);
                    } else {
                        await part.toBuffer(); // consume
                    }
                }

                if (!filePath) {
                    return reply.status(400).send({ error: 'No PDF file uploaded' });
                }

                // Non-blocking ingestion - start and return immediately 
                const result = await ingestPdf(filePath, originalName, server.log);

                return {
                    success: result.success,
                    course_id: result.course_id,
                    course_title: result.course_title,
                    lesson_id: result.lesson_id,
                    lesson_title: result.lesson_title,
                    category: result.category,
                    material_id: result.material_id,
                    error: result.error
                };
            } catch (err: any) {
                server.log.error(err);
                return reply.status(500).send({ error: 'PDF ingestion failed', details: err.message });
            }
        }
    )

    // ── POST /admin/import-library (Scan & ingest data/library folder) ──
    server.post(
        '/import-library',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                server.log.info('[Admin] Starting library scan...');
                const result = await scanLibrary(server.log);
                return {
                    message: `Processed ${result.processed}/${result.total} PDFs (${result.failed} failed)`,
                    total: result.total,
                    processed: result.processed,
                    failed: result.failed,
                    results: result.results
                };
            } catch (err: any) {
                server.log.error(err);
                return reply.status(500).send({ error: 'Library scan failed', details: err.message });
            }
        }
    )

    // ── GET /admin/materials (List all uploaded materials) ──────────
    server.get(
        '/materials',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                const result = await query(
                    `SELECT id, original_name, detected_category, status, error_message, course_id, lesson_id, created_at
                     FROM uploaded_materials
                     ORDER BY created_at DESC
                     LIMIT 100`
                );
                return result.rows;
            } catch (err: any) {
                // Table may not exist yet
                return [];
            }
        }
    )
}
