import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import crypto from 'crypto'

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
        `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INT DEFAULT 0`,
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
    server.post('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
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
            return result.rows[0]
        } catch (e: any) {
            server.log.error(`[Courses] Create error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to create course', details: e.message })
        }
    })

    // GET /admin/courses — list all courses with lesson count
    server.get('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
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
    server.delete('/:id', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params as { id: string }
            await query(`DELETE FROM courses WHERE id = $1`, [id])
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

            const modules = await query(
                `SELECT * FROM modules WHERE course_id = $1 ORDER BY sort_order ASC, created_at ASC`,
                [id]
            )

            for (const mod of modules.rows) {
                const lessons = await query(
                    `SELECT id, title, summary, pdf_path, sort_order, position, created_at
                     FROM lessons WHERE module_id = $1 ORDER BY sort_order ASC, created_at ASC`,
                    [mod.id]
                )
                mod.lessons = lessons.rows
            }

            return modules.rows
        } catch (e: any) {
            server.log.error(`[Courses] Lessons fetch error: ${e.message}`)
            return reply.status(500).send({ error: 'Failed to fetch lessons', details: e.message })
        }
    })
}
