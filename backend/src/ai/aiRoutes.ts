import { FastifyInstance } from 'fastify'

// Placeholder — AI routes реализуем на следующем шаге
export default async function aiRoutes(server: FastifyInstance) {
    server.get('/', async () => ({ status: 'ai module ready' }))
}
