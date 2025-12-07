#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'

const args = process.argv.slice(2)
const rootArg = args.find(a => !a.startsWith('-'))
const root = path.resolve(rootArg || 'content')
const dryRun = args.includes('--dry-run') || args.includes('-n')

function kebab(s) {
  return s
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      await walk(full)
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      const rel = path.relative(process.cwd(), full)
      const parts = rel.split(path.sep)
      // transform segments: kebabify dirs and filename (without ext)
      const transformed = parts.map((seg, i) => {
        if (i === parts.length - 1) {
          const ext = path.extname(seg)
          const name = path.basename(seg, ext)
          return kebab(name) + ext
        }
        return kebab(seg)
      })
      const target = path.join(...transformed)
      if (target !== rel) {
        console.log(`git mv -v "${rel}" "${target}"`)
      }
    }
  }
}

walk(root).catch((err) => {
  console.error(err)
  process.exit(1)
})
