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

async function touchSystemUpdateToken(reason: string) {
    const token = `${Date.now()}:${reason}`
    await query(
        `INSERT INTO system_state (key, value, updated_at)
         VALUES ('update_banner_token', $1, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [token]
    )
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
                `SELECT id, login, name, role, onboarding_passed, trading_level, created_at, last_login
         FROM users
         ORDER BY created_at DESC`
            )
            return result.rows
        }
    )

    // ── POST /admin/users/:id/reset-password ───────────────────
    server.post(
        '/users/:id/reset-password',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                const { id } = request.params as { id: string }

                const userRes = await query(
                    `SELECT id, login, role FROM users WHERE id = $1 LIMIT 1`,
                    [id]
                )
                if (!userRes.rows.length) {
                    return reply.status(404).send({ error: 'User not found' })
                }

                const target = userRes.rows[0]
                if (target.role !== 'student') {
                    return reply.status(400).send({ error: 'Only student password can be reset from this panel' })
                }

                const generatedPassword = generatePassword(14)
                const passwordHash = await argon2.hash(generatedPassword)

                await query(
                    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
                    [passwordHash, id]
                )

                await query(
                    `INSERT INTO audit_logs (user_id, action, details)
                     VALUES ($1, 'RESET_PASSWORD', $2)`,
                    [request.user.id, JSON.stringify({ target_user_id: id, login: target.login })]
                ).catch(() => null)

                return {
                    success: true,
                    user_id: id,
                    login: target.login,
                    password: generatedPassword,
                }
            } catch (err: any) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Failed to reset password', details: err.message })
            }
        }
    )

    // ── DELETE /admin/users/:id ────────────────────────────────
    server.delete(
        '/users/:id',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                const { id } = request.params as { id: string }

                if (id === request.user.id) {
                    return reply.status(400).send({ error: 'You cannot delete your own account' })
                }

                const userRes = await query(
                    `SELECT id, login, role FROM users WHERE id = $1 LIMIT 1`,
                    [id]
                )
                if (!userRes.rows.length) {
                    return reply.status(404).send({ error: 'User not found' })
                }

                const target = userRes.rows[0]
                if (target.role !== 'student') {
                    return reply.status(400).send({ error: 'Only student accounts can be deleted from this panel' })
                }

                await query(`DELETE FROM users WHERE id = $1`, [id])

                await query(
                    `INSERT INTO audit_logs (user_id, action, details)
                     VALUES ($1, 'DELETE_USER', $2)`,
                    [request.user.id, JSON.stringify({ deleted_user_id: id, login: target.login })]
                ).catch(() => null)

                return { success: true, deleted_user_id: id }
            } catch (err: any) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Failed to delete student', details: err.message })
            }
        }
    )

    // ── GET /admin/logs ───────────────────────────────────────
    server.get(
        '/logs',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            const action = String(request.query?.action || '').trim()
            const search = String(request.query?.search || '').trim()
            const limit = Math.min(Math.max(parseInt(String(request.query?.limit || '200'), 10) || 200, 1), 500)

            const where: string[] = []
            const params: any[] = []

            if (action) {
                params.push(action)
                where.push(`al.action = $${params.length}`)
            }

            if (search) {
                params.push(`%${search}%`)
                where.push(`(u.login ILIKE $${params.length} OR COALESCE(al.details, '') ILIKE $${params.length})`)
            }

            params.push(limit)
            const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

            const result = await query(
                `SELECT al.*, u.login as user_login
                 FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id
                 ${whereSql}
                 ORDER BY al.created_at DESC
                 LIMIT $${params.length}`,
                params
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
                const coursesResult = await query(`SELECT COUNT(*) as count FROM courses`);
                const activeCourses = coursesResult.rows[0].count;

                // AI Interactions count
                let aiInteractions = 0;
                try {
                    const aiResult = await query(`SELECT COUNT(*) as count FROM ai_requests`);
                    aiInteractions = aiResult.rows[0].count;
                } catch (e) { /* Ignore if table doesnt exist yet */ }

                let importedMaterials = 0
                let processedMaterials = 0
                try {
                    const materialRes = await query(`SELECT COUNT(*) FILTER (WHERE status = 'processed') AS processed, COUNT(*) AS total FROM uploaded_materials`)
                    importedMaterials = parseInt(materialRes.rows[0]?.total || 0, 10) || 0
                    processedMaterials = parseInt(materialRes.rows[0]?.processed || 0, 10) || 0
                } catch {
                    importedMaterials = 0
                    processedMaterials = 0
                }

                let recentActivity = 0
                try {
                    const recentRes = await query(`SELECT COUNT(*) AS count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`)
                    recentActivity = parseInt(recentRes.rows[0]?.count || 0, 10) || 0
                } catch {
                    recentActivity = 0
                }

                return {
                    totalStudents: parseInt(totalStudents) || 0,
                    activeCourses: parseInt(activeCourses) || 0,
                    aiInteractions: parseInt(aiInteractions as any) || 0,
                    importedMaterials,
                    processedMaterials,
                    recentActivity,
                    systemAlerts: 0
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
                    const looksLikePdf =
                        (part.type === 'file') &&
                        (
                            part.mimetype === 'application/pdf' ||
                            String(part.filename || '').toLowerCase().endsWith('.pdf')
                        );

                    if (looksLikePdf) {
                        const safeName = path.basename(String(part.filename || 'uploaded.pdf')).replace(/[^a-zA-Z0-9._\-()\s]/g, '_');
                        originalName = safeName || 'uploaded.pdf';
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

                // Ingestion runs in-request for now (stable + returns created ids)
                const result = await ingestPdf(filePath, originalName, server.log);

                if (result.success) {
                    try { await touchSystemUpdateToken('import_pdf') } catch { /* ignore */ }
                }

                return {
                    success: result.success,
                    course_id: result.course_id,
                    course_title: result.course_title,
                    lesson_id: result.lesson_id,
                    lesson_title: result.lesson_title,
                    lessons_created: result.lessons_created,
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
                if (result.processed > 0) {
                    try { await touchSystemUpdateToken('import_library') } catch { /* ignore */ }
                }
                return {
                    message: `Processed ${result.processed}/${result.total} PDFs (${result.skipped} skipped, ${result.failed} failed)`,
                    total: result.total,
                    processed: result.processed,
                    skipped: result.skipped,
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
                    `SELECT id, original_name, detected_category, status, error_message, course_id, lesson_id, ai_metadata, created_at
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

    // ── GET /admin/ai-requests (List AI messages) ───────────────
    server.get(
        '/ai-requests',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (request: any, reply) => {
            try {
                const search = String(request.query?.search || '').trim()
                const where = search ? `WHERE u.login ILIKE $1 OR ar.message ILIKE $1 OR ar.response ILIKE $1` : ''
                const params = search ? [`%${search}%`] : []

                const result = await query(
                    `SELECT ar.id, ar.user_id, ar.type, ar.message, ar.response, ar.provider, ar.metadata, ar.created_at,
                            u.login AS user_login
                     FROM ai_requests ar
                     LEFT JOIN users u ON u.id = ar.user_id
                     ${where}
                     ORDER BY ar.created_at DESC
                     LIMIT 200`,
                    params
                )
                return result.rows
            } catch (err: any) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Failed to fetch AI requests', details: err.message })
            }
        }
    )

    // ── GET /admin/recent-activity ──────────────────────────────
    server.get(
        '/recent-activity',
        { preValidation: [server.authenticate, requireSuperadmin] },
        async (_request: any, reply) => {
            try {
                const logs = await query(
                    `SELECT al.id, al.action, al.details, al.created_at, u.login AS user_login
                     FROM audit_logs al
                     LEFT JOIN users u ON u.id = al.user_id
                     ORDER BY al.created_at DESC
                     LIMIT 20`
                )

                const imports = await query(
                    `SELECT id, original_name, status, created_at, course_id
                     FROM uploaded_materials
                     ORDER BY created_at DESC
                     LIMIT 20`
                ).catch(() => ({ rows: [] as any[] }))

                return {
                    logs: logs.rows,
                    imports: imports.rows,
                }
            } catch (err: any) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Failed to fetch activity', details: err.message })
            }
        }
    )
}
