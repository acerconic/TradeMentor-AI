import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import crypto from 'crypto'

export async function adminCourseRoutes(server: FastifyInstance) {

    // POST /admin/courses
    server.post('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            let title = ''
            let description = ''
            let language = 'EN'
            let level = 'Beginner'

            if (request.isMultipart()) {
                const parts = request.parts()
                for await (const part of parts) {
                    if (part.type === 'file') {
                        // For now we just consume the file to not break the stream
                        await part.toBuffer()
                    } else {
                        if (part.fieldname === 'title') title = part.value as string
                        if (part.fieldname === 'description') description = part.value as string
                        if (part.fieldname === 'language') language = part.value as string
                        if (part.fieldname === 'level') level = part.value as string
                    }
                }
            } else {
                title = request.body.title
                description = request.body.description
                language = request.body.language || 'EN'
                level = request.body.level || 'Beginner'
            }

            if (!title) {
                return reply.status(400).send({ error: 'Title is required' })
            }

            const id = crypto.randomUUID()
            const now = new Date()

            const result = await query(
                `INSERT INTO "Course" (id, title, description, language, level, "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [id, title, description, language, level, now, now]
            )

            // Add initial empty module just to have structure
            const moduleId = crypto.randomUUID()
            await query(
                `INSERT INTO "Module" (id, "courseId", title, "order", "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [moduleId, id, 'Introduction', 1, now, now]
            )

            return result.rows[0]
        } catch (e) {
            server.log.error(e)
            reply.status(500).send({ error: 'Failed to create course' })
        }
    })

    // GET /admin/courses
    server.get('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const result = await query(`
                SELECT c.*, COUNT(l.id) as lessons_count
                FROM "Course" c
                LEFT JOIN "Module" m ON m."courseId" = c.id
                LEFT JOIN "Lesson" l ON l."moduleId" = m.id
                GROUP BY c.id
                ORDER BY c."createdAt" DESC
            `)
            return result.rows
        } catch (e) {
            server.log.error(e)
            reply.status(500).send({ error: 'Failed to fetch courses' })
        }
    })
}

export async function publicCourseRoutes(server: FastifyInstance) {
    // GET /courses
    server.get('/', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const result = await query(`
                SELECT c.*, COUNT(l.id) as lessons_count
                FROM "Course" c
                LEFT JOIN "Module" m ON m."courseId" = c.id
                LEFT JOIN "Lesson" l ON l."moduleId" = m.id
                GROUP BY c.id
                ORDER BY c."createdAt" DESC
            `)
            return result.rows
        } catch (e) {
            server.log.error(e)
            reply.status(500).send({ error: 'Failed to fetch courses' })
        }
    })

    // GET /courses/:id
    server.get('/:id', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params
            const res = await query(`SELECT * FROM "Course" WHERE id = $1`, [id])
            if (res.rowCount === 0) return reply.status(404).send({ error: 'Course not found' })
            return res.rows[0]
        } catch (e) {
            server.log.error(e)
            reply.status(500).send({ error: 'Failed to fetch course' })
        }
    })

    // GET /courses/:id/lessons
    server.get('/:id/lessons', { preValidation: [server.authenticate] }, async (request: any, reply) => {
        try {
            const { id } = request.params
            const modules = await query(`SELECT * FROM "Module" WHERE "courseId" = $1 ORDER BY "order" ASC`, [id])

            for (let i = 0; i < modules.rows.length; i++) {
                const moduleId = modules.rows[i].id
                const lessons = await query(`SELECT * FROM "Lesson" WHERE "moduleId" = $1 ORDER BY "order" ASC`, [moduleId])
                modules.rows[i].lessons = lessons.rows
            }

            return modules.rows
        } catch (e) {
            server.log.error(e)
            reply.status(500).send({ error: 'Failed to fetch lessons' })
        }
    })
}
