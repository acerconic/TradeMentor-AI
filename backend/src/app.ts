import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

import authRoutes from './auth/authRoutes'
import adminRoutes from './admin/adminRoutes'
import aiRoutes from './ai/aiRoutes'

export const buildServer = async (): Promise<FastifyInstance> => {
    const server = fastify({ logger: true })

    // ── Plugins ──────────────────────────────────────────────
    await server.register(cors, { origin: '*' })

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

    // ── Health Check ─────────────────────────────────────────
    server.get('/health', async () => ({ status: 'ok' }))

    return server
}
