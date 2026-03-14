import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const requireSuperadmin = async (request: any, reply: any) => {
    if (request.user?.role !== 'superadmin') {
        return reply.status(403).send({ error: 'Access denied. superadmin role required.' })
    }
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

function resolveSafePdfPath(storedPath: string): string | null {
    const raw = String(storedPath || '').trim()
    if (!raw) return null

    const normalized = path.normalize(raw)

    // Allow only files from known directories inside this repo deployment layout.
    const allowedRoots = [
        path.resolve(process.cwd(), '..', 'data', 'library'),
        path.resolve(process.cwd(), '..', 'data', 'uploads'),
        path.resolve(process.cwd(), 'data', 'library'),
        path.resolve(process.cwd(), 'data', 'uploads'),
        path.resolve(__dirname, '..', '..', '..', 'data', 'library'),
        path.resolve(__dirname, '..', '..', '..', 'data', 'uploads'),
        '/opt/render/project/src/data/library',
        '/opt/render/project/src/data/uploads',
    ].map(r => path.normalize(r))

    // If absolute path, verify it sits under an allowed root.
    if (path.isAbsolute(normalized)) {
        const ok = allowedRoots.some(root => normalized.startsWith(root + path.sep) || normalized === root)
        return ok ? normalized : null
    }

    // If relative path, resolve it against allowed roots and pick the first that exists.
    for (const root of allowedRoots) {
        const candidate = path.normalize(path.join(root, normalized))
        if (candidate.startsWith(root + path.sep) && fs.existsSync(candidate)) return candidate
    }
    return null
}

// ── Self-healing migration: ensure all needed columns exist ──────────────
export async function ensureSchema(server: FastifyInstance) {
    const migrations = [
        // Ensure courses has category + level
        `ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
        `ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Beginner'`,
        // Ensure modules has position
        `ALTER TABLE modules ADD COLUMN IF NOT EXISTS position INT DEFAULT 0`,
        // Ensure lessons has summary, pdf_path, position
        `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS summary TEXT`,
        `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_path TEXT`,
        `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS language user_language DEFAULT 'RU'`,
        `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 0`,
        // Ensure users has level used for assessment and AI personalization
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_level VARCHAR(20) NOT NULL DEFAULT 'Beginner'`,
        // Ensure progress table exists for lesson completion tracking
        `CREATE TABLE IF NOT EXISTS user_progress (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id     UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            is_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
            completed_at  TIMESTAMPTZ,
            UNIQUE(user_id, lesson_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON user_progress(lesson_id)`,
        // Ensure user settings table exists
        `CREATE TABLE IF NOT EXISTS user_settings (
            user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            language             user_language NOT NULL DEFAULT 'RU',
            email_notifications  BOOLEAN NOT NULL DEFAULT TRUE,
            push_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
            dark_mode            BOOLEAN NOT NULL DEFAULT FALSE,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        // Ensure global system state table exists (for update banner)
        `CREATE TABLE IF NOT EXISTS system_state (
            key         TEXT PRIMARY KEY,
            value       TEXT,
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `INSERT INTO system_state (key, value, updated_at)
         VALUES ('update_banner_token', 'boot', NOW())
         ON CONFLICT (key) DO NOTHING`,
        `UPDATE system_state
         SET value = CONCAT('deploy:', EXTRACT(EPOCH FROM NOW())::bigint), updated_at = NOW()
         WHERE key = 'update_banner_token'`,
        // Ensure uploaded_materials exists
        `CREATE TABLE IF NOT EXISTS uploaded_materials (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            original_name    VARCHAR(500) NOT NULL,
            stored_path      TEXT NOT NULL,
            extracted_text   TEXT,
            detected_category VARCHAR(100),
            ai_metadata      TEXT,
            course_id        UUID,
            lesson_id        UUID,
            status           VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_message    TEXT,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
    ];

    for (const sql of migrations) {
        try {
            await query(sql);
        } catch (e: any) {
            // Ignore "already exists" errors
            if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
                server.log.warn(`[Schema] Migration warning: ${e.message}`);
            }
        }
    }
    server.log.info('[Schema] Self-healing migration complete ✓');
}

export async function adminCourseRoutes(server: FastifyInstance) {

    // POST /admin/courses — create course manually
    server.post('/', { preValidation: [server.authenticate, requireSuperadmin] }, async (request: any, reply) => {
        try {
            let title = ''
            let description = ''
            let language = 'RU'
            let level = 'Beginner'
            let category = 'Other'

            if (request.isMultipart()) {
                const parts = request.parts()
                for await (const part of parts) {
                    if (part.type === 'file') {
                        await part.toBuffer()
                    } else {
                        if (part.fieldname === 'title') title = part.value as string
                        if (part.fieldname === 'description') description = part.value as string
                        if (part.fieldname === 'language') language = part.value as string
                        if (part.fieldname === 'level') level = part.value as string
                        if (part.fieldname === 'category') category = part.value as string
                    }
                }
            } else {
                const body = request.body || {}
                title = body.title || ''
                description = body.description || ''
                language = body.language || 'RU'
                level = body.level || 'Beginner'
                category = body.category || 'Other'
            }

            if (!title) {
                return reply.status(400).send({ error: 'Title is required' })
            }

            const id = crypto.randomUUID()
            const result = await query(
                `INSERT INTO courses (id, title, description, category, language, level, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
                [id, title, description, category, language, level]
            )

            // Create default module
            const moduleId = crypto.randomUUID()
            await query(
                `INSERT INTO modules (id, course_id, title, sort_order, position, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $4, NOW(), NOW())`,
                [moduleId, id, 'Introduction', 1]
            )

            server.log.info(`[Courses] Created course: ${title} (${id})`);
            try { await touchSystemUpdateToken('course_created') } catch { /* ignore */ }
            return result.rows[0]
        } catch (e: any) {
            server.log.error(`[Courses] Create error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to create course', details: e.message })
        }
    })

    // GET /admin/courses — list all courses with lesson count
    server.get('/', { preValidation: [server.authenticate, requireSuperadmin] }, async (request: any, reply) => {
        try {
            const result = await query(`
                SELECT
                    c.id,
                    c.title,
                    c.description,
                    c.category,
                    c.level,
                    c.language,
                    c.created_at,
                    COUNT(DISTINCT m.id) as modules_count,
                    COUNT(DISTINCT l.id) as lessons_count
                FROM courses c
                LEFT JOIN modules m ON m.course_id = c.id
                LEFT JOIN lessons l ON l.module_id = m.id
                GROUP BY c.id, c.title, c.description, c.category, c.level, c.language, c.created_at
                ORDER BY c.created_at DESC
            `)
            return result.rows
        } catch (e: any) {
            server.log.error(`[Courses] Fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch courses', details: e.message })
        }
    })

    // DELETE /admin/courses/:id
    server.delete('/:id', { preValidation: [server.authenticate, requireSuperadmin] }, async (request: any, reply) => {
        try {
            const { id } = request.params as { id: string }
            await query(`DELETE FROM courses WHERE id = $1`, [id])
            try { await touchSystemUpdateToken('course_deleted') } catch { /* ignore */ }
            return { success: true }
        } catch (e: any) {
            server.log.error(`[Courses] Delete error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to delete course' })
        }
    })
}

export async function publicCourseRoutes(server: FastifyInstance) {

    // GET /courses — public list (authenticated students)
    server.get('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const userId = request.user?.id;

            const languageRes = await query(
                `SELECT language FROM users WHERE id = $1 LIMIT 1`,
                [userId]
            );
            const preferredLanguage = (String(languageRes.rows[0]?.language || 'RU').toUpperCase() === 'UZ') ? 'UZ' : 'RU';

            const result = await query(`
                SELECT
                    c.id,
                    c.title,
                    c.description,
                    c.category,
                    c.level,
                    c.language,
                    c.created_at,
                    COUNT(DISTINCT m.id) as modules_count,
                    COUNT(DISTINCT l.id) as lessons_count,
                    COUNT(DISTINCT CASE WHEN up.is_completed = TRUE THEN l.id END) as completed_lessons,
                    CASE
                        WHEN COUNT(DISTINCT l.id) = 0 THEN 0
                        ELSE ROUND((COUNT(DISTINCT CASE WHEN up.is_completed = TRUE THEN l.id END)::numeric / COUNT(DISTINCT l.id)::numeric) * 100, 0)
                    END as progress_percent
                FROM courses c
                LEFT JOIN modules m ON m.course_id = c.id
                LEFT JOIN lessons l ON l.module_id = m.id
                LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
                GROUP BY c.id, c.title, c.description, c.category, c.level, c.language, c.created_at
                ORDER BY c.created_at DESC
            `, [userId])

            const allCourses = result.rows || []

            // Student-facing academy should prefer courses with real lesson structure.
            const withLessons = allCourses.filter((course: any) => Number(course.lessons_count || 0) > 0)
            const preferredWithLessons = withLessons.filter(
                (course: any) => String(course.language || '').toUpperCase() === preferredLanguage
            )

            const selected = preferredWithLessons.length > 0 ? preferredWithLessons : withLessons
            const isFallbackLanguage = preferredWithLessons.length === 0 && withLessons.length > 0

            return selected.map((course: any) => ({
                ...course,
                preferred_language: preferredLanguage,
                is_fallback_language: isFallbackLanguage,
            }))
        } catch (e: any) {
            server.log.error(`[Courses] Public fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch courses', details: e.message })
        }
    })

    // GET /courses/:id — single course
    server.get('/:id', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params as { id: string }
            const res = await query(`SELECT * FROM courses WHERE id = $1`, [id])
            if (!res.rows.length) return reply.status(404).send({ error: 'Course not found' })
            return res.rows[0]
        } catch (e: any) {
            server.log.error(`[Courses] Fetch single error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch course' })
        }
    })

    // GET /courses/:id/lessons — full course structure with modules + lessons
    server.get('/:id/lessons', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params as { id: string }
            const userId = request.user?.id

            const modules = await query(
                `SELECT * FROM modules WHERE course_id = $1 ORDER BY sort_order ASC, created_at ASC`,
                [id]
            )

            for (const mod of modules.rows) {
                const lessons = await query(
                    `SELECT l.id, l.title, l.summary, l.pdf_path, l.language, l.sort_order, l.position, l.created_at
                            , COALESCE(up.is_completed, FALSE) as is_completed
                            , up.completed_at
                     FROM lessons l
                     LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $2
                     WHERE l.module_id = $1
                     ORDER BY l.sort_order ASC, l.created_at ASC`,
                    [mod.id, userId]
                )
                mod.lessons = lessons.rows
            }

            return modules.rows
        } catch (e: any) {
            server.log.error(`[Courses] Lessons fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch lessons', details: e.message })
        }
    })

    // GET /courses/lessons/:lessonId — lesson details + next lesson id
    server.get('/lessons/:lessonId', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { lessonId } = request.params as { lessonId: string }
            const userId = request.user?.id

            const res = await query(
                `SELECT 
                    l.id,
                    l.title,
                    l.summary,
                    l.pdf_path,
                    l.language,
                    l.sort_order,
                    l.position,
                    l.created_at,
                    m.id as module_id,
                    m.title as module_title,
                    m.sort_order as module_sort_order,
                    c.id as course_id,
                    c.title as course_title,
                    c.category as course_category,
                    c.level as course_level,
                    c.language as course_language,
                    COALESCE(up.is_completed, FALSE) as is_completed,
                    up.completed_at
                 FROM lessons l
                 JOIN modules m ON m.id = l.module_id
                 JOIN courses c ON c.id = m.course_id
                 LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $2
                 WHERE l.id = $1
                 LIMIT 1`,
                [lessonId, userId]
            )

            if (!res.rows.length) return reply.status(404).send({ error: 'Lesson not found' })
            const lesson = res.rows[0]

            try {
                await query(
                    `INSERT INTO audit_logs (user_id, action, details)
                     VALUES ($1, 'OPEN_LESSON', $2)`,
                    [userId, JSON.stringify({ lesson_id: lessonId, course_id: lesson.course_id })]
                )
            } catch {
                // ignore audit issues to keep lesson flow stable
            }

            // Determine next lesson:
            // 1) Next by sort_order within same module
            // 2) Else first lesson of next module within same course
            let nextLessonId: string | null = null

            const nextInModule = await query(
                `SELECT id
                 FROM lessons
                 WHERE module_id = $1 AND sort_order > $2
                 ORDER BY sort_order ASC, created_at ASC
                 LIMIT 1`,
                [lesson.module_id, lesson.sort_order || 0]
            )
            if (nextInModule.rows.length) {
                nextLessonId = nextInModule.rows[0].id
            } else {
                const nextModule = await query(
                    `SELECT id
                     FROM modules
                     WHERE course_id = $1 AND sort_order > $2
                     ORDER BY sort_order ASC, created_at ASC
                     LIMIT 1`,
                    [lesson.course_id, lesson.module_sort_order || 0]
                )
                if (nextModule.rows.length) {
                    const firstLesson = await query(
                        `SELECT id
                         FROM lessons
                         WHERE module_id = $1
                         ORDER BY sort_order ASC, created_at ASC
                         LIMIT 1`,
                        [nextModule.rows[0].id]
                    )
                    if (firstLesson.rows.length) nextLessonId = firstLesson.rows[0].id
                }
            }

            return { ...lesson, next_lesson_id: nextLessonId }
        } catch (e: any) {
            server.log.error(`[Courses] Lesson fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch lesson', details: e.message })
        }
    })

    // GET /courses/:id/progress — user progress in a course
    server.get('/:id/progress', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params as { id: string }
            const userId = request.user?.id

            const totalRes = await query(
                `SELECT COUNT(*)::int as total
                 FROM lessons l
                 JOIN modules m ON m.id = l.module_id
                 WHERE m.course_id = $1`,
                [id]
            )

            const completedRes = await query(
                `SELECT COUNT(*)::int as completed
                 FROM user_progress up
                 JOIN lessons l ON l.id = up.lesson_id
                 JOIN modules m ON m.id = l.module_id
                 WHERE m.course_id = $1
                   AND up.user_id = $2
                   AND up.is_completed = TRUE`,
                [id, userId]
            )

            const total = Number(totalRes.rows[0]?.total || 0)
            const completed = Number(completedRes.rows[0]?.completed || 0)
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0

            return { total, completed, percent }
        } catch (e: any) {
            server.log.error(`[Courses] Progress fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch progress', details: e.message })
        }
    })

    // POST /courses/lessons/:lessonId/complete — mark lesson completed
    server.post('/lessons/:lessonId/complete', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { lessonId } = request.params as { lessonId: string }
            const userId = request.user?.id

            await query(
                `INSERT INTO user_progress (id, user_id, lesson_id, is_completed, completed_at)
                 VALUES ($1, $2, $3, TRUE, NOW())
                 ON CONFLICT (user_id, lesson_id)
                 DO UPDATE SET is_completed = TRUE, completed_at = NOW()`,
                [crypto.randomUUID(), userId, lessonId]
            )

            try {
                await query(
                    `INSERT INTO audit_logs (user_id, action, details)
                     VALUES ($1, 'COMPLETE_LESSON', $2)`,
                    [userId, JSON.stringify({ lesson_id: lessonId })]
                )
            } catch {
                // ignore audit issues to keep completion flow stable
            }

            return { success: true }
        } catch (e: any) {
            server.log.error(`[Courses] Complete lesson error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to complete lesson', details: e.message })
        }
    })

    // GET /courses/lessons/:lessonId/pdf — stream lesson PDF (auth)
    server.get('/lessons/:lessonId/pdf', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { lessonId } = request.params as { lessonId: string }
            const res = await query(`SELECT pdf_path, title FROM lessons WHERE id = $1 LIMIT 1`, [lessonId])
            if (!res.rows.length) return reply.status(404).send({ error: 'Lesson not found' })

            const pdfPath = resolveSafePdfPath(res.rows[0].pdf_path)
            if (!pdfPath) return reply.status(404).send({ error: 'PDF not found' })
            if (!fs.existsSync(pdfPath)) return reply.status(404).send({ error: 'PDF not found' })

            reply.header('Content-Type', 'application/pdf')
            reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(String(res.rows[0].title || 'lesson'))}.pdf"`)

            const stream = fs.createReadStream(pdfPath)
            return reply.send(stream)
        } catch (e: any) {
            server.log.error(`[Courses] Lesson PDF error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to load PDF', details: e.message })
        }
    })
}
