import fs from 'node:fs'
import { resolve } from 'node:path'

const EXCLUDED_FILES = new Set(['registry.ts', 'messages.ts', 'validators.ts'])
const EXCLUDED_FOLDERS = new Set(['validators', 'messages'])
const EXCLUDED_PATTERNS: RegExp[] = [/\.d\.ts$/]

const isExcluded = (fileName: string) => EXCLUDED_FILES.has(fileName) || EXCLUDED_PATTERNS.some(rx => rx.test(fileName))

export function readFiles(dirPath: string, files: string[] = []) {
    const paths = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const path of paths) {
        const basePath = resolve(dirPath, path.name)

        if (path.isDirectory()) {
            if (EXCLUDED_FOLDERS.has(path.name))
                continue

            readFiles(basePath, files)
        }
        else if (!isExcluded(path.name)) {
            files.push(basePath)
        }
    }

    return files
}

export const getModuleName = (rootName: string, file: string): string => file.split(rootName).pop()!.split('.').shift() || file
