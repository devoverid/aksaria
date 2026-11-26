import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'prisma/config'

try {
    process.loadEnvFile()
}
catch {
    // The file is optional; containers provide the environment directly.
}

export default defineConfig({
    schema: path.join('db', 'schema.prisma'),
    migrations: {
        path: path.join('db', 'migrations'),
    },
    views: {
        path: path.join('db', 'views'),
    },
    typedSql: {
        path: path.join('db', 'queries'),
    },
})
