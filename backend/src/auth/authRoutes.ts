import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import argon2 from 'argon2'
import z from 'zod'

const LoginSchema = z.object({
    login: z.string().min(1),
    password: z.string().min(1),
})

export default async function authRoutes(server: FastifyInstance) {

    // ── POST /auth/login ──────────────────────────────────────
    server.post('/login', async (request, reply) => {
        try {
            const body = LoginSchema.parse(request.body)

            // Ищем пользователя по логину
            const result = await query(
                'SELECT * FROM users WHERE login = $1 LIMIT 1',
                [body.login]
            )

            if (result.rows.length === 0) {
                return reply.status(401).send({ error: 'Неверный логин или пароль' })
            }

            const user = result.rows[0]

            // Проверяем пароль через argon2
            const isValid = await argon2.verify(user.password_hash, body.password)
            if (!isValid) {
                return reply.status(401).send({ error: 'Неверный логин или пароль' })
            }

            // Обновляем last_login
            await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])

            // Пишем аудит
            await query(
                'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
                [user.id, 'LOGIN', request.ip]
            )

            // Генерируем JWT
            const token = server.jwt.sign(
                { id: user.id, role: user.role, login: user.login },
                { expiresIn: '7d' }
            )

            return {
                token,
                user: {
                    id: user.id,
                    login: user.login,
                    name: user.name,
                    role: user.role,
                    onboardingPassed: user.onboarding_passed,
                    language: user.language,
                },
            }
        } catch (err) {
            if (err instanceof z.ZodError) {
                return reply.status(400).send({ error: 'Неверные данные', details: err.issues })
            }
            server.log.error(err)
            return reply.status(500).send({ error: 'Ошибка сервера' })
        }
    })

    // ── GET /auth/me ──────────────────────────────────────────
    server.get(
        '/me',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const decoded = request.user
                const result = await query(
                    'SELECT id, login, name, role, language, onboarding_passed, created_at FROM users WHERE id = $1',
                    [decoded.id]
                )

                if (result.rows.length === 0) {
                    return reply.status(404).send({ error: 'Пользователь не найден' })
                }

                const u = result.rows[0]
                return {
                    id: u.id,
                    login: u.login,
                    name: u.name,
                    role: u.role,
                    language: u.language,
                    onboardingPassed: u.onboarding_passed,
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )
}
