import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = new URL('../..', import.meta.url).pathname
const spec = execFileSync(process.env.PYTHON ?? 'python3', ['-m', 'backend.openapi'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
const file = join(mkdtempSync(join(tmpdir(), 'moni-openapi-')), 'openapi.json')
writeFileSync(file, spec)
execFileSync('npx', ['openapi-typescript', file, '-o', 'src/types/api.gen.ts'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'inherit' })
