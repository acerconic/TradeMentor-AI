import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import argon2 from 'argon2'
import z from 'zod'

const LoginSchema = z.object({
    login: z.string().min(1),
    password: z.string().min(1),
})

const UpdateLanguageSchema = z.object({
    language: z.enum(['RU', 'UZ'])
})

const UpdateSettingsSchema = z.object({
    language: z.enum(['RU', 'UZ']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    darkMode: z.boolean().optional(),
})

const AssessmentAnswerSchema = z.object({
    questionId: z.string(),
    value: z.number().int().min(1).max(3),
})

const SubmitAssessmentSchema = z.object({
    answers: z.array(AssessmentAnswerSchema).min(10).max(15),
})

function scoreToLevel(scorePercent: number): 'Beginner' | 'Intermediate' | 'Advanced' {
    if (scorePercent >= 80) return 'Advanced'
    if (scorePercent >= 50) return 'Intermediate'
    return 'Beginner'
}

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
                        tradingLevel: user.trading_level || 'Beginner',
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
                    'SELECT id, login, name, role, language, onboarding_passed, trading_level, created_at FROM users WHERE id = $1',
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
                    tradingLevel: u.trading_level || 'Beginner',
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── PATCH /auth/language ────────────────────────────────────
    server.patch(
        '/language',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const { language } = UpdateLanguageSchema.parse(request.body)
                const userId = request.user?.id

                await query(
                    `UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2`,
                    [language, userId]
                )

                await query(
                    `INSERT INTO user_settings (user_id, language, updated_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET language = EXCLUDED.language, updated_at = NOW()`,
                    [userId, language]
                ).catch(() => null)

                return { success: true, language }
            } catch (err) {
                if (err instanceof z.ZodError) {
                    return reply.status(400).send({ error: 'Неверные данные', details: err.issues })
                }
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── GET /auth/update-notice ────────────────────────────────
    server.get(
        '/update-notice',
        { preValidation: [server.authenticate] },
        async (_request: any, reply) => {
            try {
                const result = await query(
                    `SELECT value, updated_at FROM system_state WHERE key = 'update_banner_token' LIMIT 1`
                )
                const row = result.rows[0]
                return {
                    token: row?.value || 'boot',
                    updatedAt: row?.updated_at || null,
                    message: 'Пожалуйста, обновите сайт с помощью F5. Если не поможет — нажмите Shift + Ctrl + F5.'
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── GET /auth/settings ─────────────────────────────────────
    server.get(
        '/settings',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const userId = request.user?.id
                const result = await query(
                    `SELECT us.language, us.email_notifications, us.push_notifications, us.dark_mode
                     FROM user_settings us
                     WHERE us.user_id = $1
                     LIMIT 1`,
                    [userId]
                )

                if (!result.rows.length) {
                    const userRes = await query(`SELECT language FROM users WHERE id = $1 LIMIT 1`, [userId])
                    return {
                        language: userRes.rows[0]?.language || 'RU',
                        emailNotifications: true,
                        pushNotifications: true,
                        darkMode: false,
                    }
                }

                const row = result.rows[0]
                return {
                    language: row.language,
                    emailNotifications: Boolean(row.email_notifications),
                    pushNotifications: Boolean(row.push_notifications),
                    darkMode: Boolean(row.dark_mode),
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── PATCH /auth/settings ───────────────────────────────────
    server.patch(
        '/settings',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const payload = UpdateSettingsSchema.parse(request.body)
                const userId = request.user?.id

                const userRes = await query(`SELECT language FROM users WHERE id = $1 LIMIT 1`, [userId])
                const effectiveLanguage = payload.language || userRes.rows[0]?.language || 'RU'

                await query(
                    `INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, dark_mode, updated_at)
                     VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, TRUE), COALESCE($5, FALSE), NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                        language = EXCLUDED.language,
                        email_notifications = COALESCE($3, user_settings.email_notifications),
                        push_notifications = COALESCE($4, user_settings.push_notifications),
                        dark_mode = COALESCE($5, user_settings.dark_mode),
                        updated_at = NOW()`,
                    [
                        userId,
                        effectiveLanguage,
                        payload.emailNotifications,
                        payload.pushNotifications,
                        payload.darkMode,
                    ]
                )

                if (payload.language) {
                    await query(`UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2`, [payload.language, userId])
                }

                return { success: true }
            } catch (err) {
                if (err instanceof z.ZodError) {
                    return reply.status(400).send({ error: 'Неверные данные', details: err.issues })
                }
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── GET /auth/assessment/status ────────────────────────────
    server.get(
        '/assessment/status',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const userId = request.user?.id
                const result = await query(
                    `SELECT onboarding_passed, trading_level, language FROM users WHERE id = $1 LIMIT 1`,
                    [userId]
                )
                const row = result.rows[0]
                return {
                    onboardingPassed: Boolean(row?.onboarding_passed),
                    tradingLevel: row?.trading_level || 'Beginner',
                    language: row?.language || 'RU',
                }
            } catch (err) {
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )

    // ── POST /auth/assessment/submit ───────────────────────────
    server.post(
        '/assessment/submit',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const { answers } = SubmitAssessmentSchema.parse(request.body)
                const userId = request.user?.id

                const maxScore = answers.length * 3
                const totalScore = answers.reduce((sum, item) => sum + item.value, 0)
                const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
                const level = scoreToLevel(scorePercent)

                await query(
                    `INSERT INTO assessment_results (id, user_id, answers, score, created_at)
                     VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
                    [userId, JSON.stringify({ answers }), scorePercent]
                )

                await query(
                    `UPDATE users
                     SET onboarding_passed = TRUE,
                         trading_level = $1,
                         updated_at = NOW()
                     WHERE id = $2`,
                    [level, userId]
                )

                return {
                    success: true,
                    level,
                    score: scorePercent,
                }
            } catch (err) {
                if (err instanceof z.ZodError) {
                    return reply.status(400).send({ error: 'Неверные данные', details: err.issues })
                }
                server.log.error(err)
                return reply.status(500).send({ error: 'Ошибка сервера' })
            }
        }
    )
}
