import 'dotenv/config'
import { buildServer } from './app'

const start = async () => {
    const server = await buildServer()
    try {
        const port = parseInt(process.env.PORT || '3001', 10)
        await server.listen({ port, host: '0.0.0.0' })
        console.log(`✓ Server running at http://localhost:${port}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()
