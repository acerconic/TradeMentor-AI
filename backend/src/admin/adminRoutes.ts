import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import argon2 from 'argon2'
import z from 'zod'
import crypto from 'crypto'

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
}
