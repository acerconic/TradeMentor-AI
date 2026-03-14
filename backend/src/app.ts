import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

import authRoutes from './auth/authRoutes'
import adminRoutes from './admin/adminRoutes'
import aiRoutes from './ai/aiRoutes'
import multipart from '@fastify/multipart'
import { publicCourseRoutes, adminCourseRoutes, ensureSchema } from './courses/courseRoutes'

export const buildServer = async (): Promise<FastifyInstance> => {
    const server = fastify({ logger: true })

    // ── Plugins ──────────────────────────────────────────────
    const allowedOrigins = new Set([
        'https://tradementor-ai.netlify.app',
        'https://tradementor-ai.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ])

    await server.register(cors, {
        origin: (origin, cb) => {
            // Allow non-browser clients / same-origin server calls.
            if (!origin) return cb(null, true)
            if (allowedOrigins.has(origin)) return cb(null, true)
            return cb(new Error('CORS origin not allowed'), false)
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Language'],
        credentials: true,
        maxAge: 86400,
    })
    await server.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } })

    await server.register(jwt, {
        secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
    })

    // Декоратор authenticate для защищённых эндпоинтов
    server.decorate('authenticate', async (request: any, reply: any) => {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })

    // ── Routes ───────────────────────────────────────────────
    server.register(authRoutes, { prefix: '/auth' })
    server.register(adminRoutes, { prefix: '/admin' })
    server.register(aiRoutes, { prefix: '/ai' })
    server.register(publicCourseRoutes, { prefix: '/courses' })
    server.register(adminCourseRoutes, { prefix: '/admin/courses' })

    // ── Health Check ─────────────────────────────────────────
    server.get('/health', async () => ({ status: 'ok' }))

    // ── Self-healing schema migration (runs on every startup) ─
    server.addHook('onReady', async () => {
        try {
            await ensureSchema(server)
        } catch (e: any) {
            server.log.error(`[Schema] ensureSchema failed: ${e.message}`)
        }
    })

    return server
}
