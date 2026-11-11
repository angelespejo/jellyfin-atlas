/**
 * Interactive commit + push helper.
 *
 * Asks for a Conventional Commit message (type, scope, description), stages
 * every change (`git add .`), commits it and pushes the current branch.
 *
 * Usage: pnpm push
 */
import { spawnSync } from 'node:child_process'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import type { Interface } from 'node:readline/promises'
import { COMMIT_TYPES, MAX_SUBJECT, commitMessage } from '../commits.ts'

interface GitResult {
  ok: boolean
  output: string
}

function git(args: string[], capture = false): GitResult {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  })
  if (result.error) throw result.error
  return { ok: result.status === 0, output: (result.stdout ?? '').trim() }
}

async function askType(rl: Interface): Promise<string> {
  console.log('\nCommit type:')
  COMMIT_TYPES.forEach((entry, index) =>
    console.log(`  ${String(index + 1).padStart(2)}) ${entry.type.padEnd(9)} ${entry.hint}`)
  )

  while (true) {
    const answer = (await rl.question('Type [1-10, name, or Enter for feat]: '))
      .trim()
      .toLowerCase()
    if (!answer) return 'feat'

    const byName = COMMIT_TYPES.find((entry) => entry.type === answer)
    if (byName) return byName.type

    const byIndex = COMMIT_TYPES[Number(answer) - 1]
    if (Number.isInteger(Number(answer)) && byIndex) return byIndex.type

    console.log('✖ Unknown type, try again.')
  }
}

async function askScope(rl: Interface): Promise<string> {
  const answer = (await rl.question('Scope (optional, e.g. map, table): ')).trim()
  return answer.replace(/^\(|\)$/g, '').replace(/\s+/g, '-')
}

async function askSubject(rl: Interface): Promise<string> {
  while (true) {
    const answer = (
      await rl.question('Description (imperative, e.g. "add country popup"): ')
    ).trim()
    if (!answer) {
      console.log('✖ A description is required.')
      continue
    }
    if (answer.length > MAX_SUBJECT) {
      console.log(`✖ Keep it under ${MAX_SUBJECT} characters.`)
      continue
    }
    return answer.replace(/\.$/, '')
  }
}

async function confirm(rl: Interface, question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? '(Y/n)' : '(y/N)'
  const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase()
  if (!answer) return defaultYes
  return answer === 'y' || answer === 'yes'
}

async function main(): Promise<void> {
  if (!stdin.isTTY) throw new Error('This script needs an interactive terminal.')

  const changes = git(['status', '--porcelain'], true).output
  if (!changes) {
    console.log('✔ Nothing to commit, the working tree is clean.')
    return
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], true).output
  if (!branch || branch === 'HEAD') throw new Error('Detached HEAD: check out a branch first.')

  const files = changes.split('\n')
  console.log(`\n${files.length} pending change(s) on ${branch}:`)
  for (const line of files.slice(0, 15)) console.log(`  ${line}`)
  if (files.length > 15) console.log(`  … and ${files.length - 15} more`)

  const rl = createInterface({ input: stdin, output: stdout })
  try {
    const type = await askType(rl)
    const scope = await askScope(rl)
    const subject = await askSubject(rl)
    const message = commitMessage(type, scope, subject)

    console.log(`\n  ${message}\n`)
    if (!(await confirm(rl, `Stage every change and commit on ${branch}?`))) {
      console.log('✖ Aborted, nothing was committed.')
      return
    }

    if (!git(['add', '.']).ok) throw new Error('git add failed.')
    if (!git(['commit', '-m', message]).ok) throw new Error('git commit failed.')

    const hash = git(['rev-parse', '--short', 'HEAD'], true).output
    console.log(`\n✔ Committed ${hash} on ${branch}.`)

    if (!(await confirm(rl, 'Push this branch now?'))) {
      console.log('✔ Commit kept, push it later with `git push`.')
      return
    }

    const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], true)
    const pushed = upstream.ok ? git(['push']) : git(['push', '--set-upstream', 'origin', branch])
    if (!pushed.ok) throw new Error('git push failed.')

    console.log(`✔ Pushed ${upstream.ok ? upstream.output : `origin/${branch}`}.`)
  } finally {
    rl.close()
  }
}

process.on('SIGINT', () => {
  console.log('\n✖ Aborted.')
  process.exit(130)
})

try {
  await main()
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
