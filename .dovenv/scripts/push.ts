/**
 * Interactive commit + push helper.
 *
 * Three questions, in order: which files to stage, which Conventional Commit to
 * write (type, scope, description) and which branch to push to (or skip the push).
 *
 * Usage: pnpm push
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import type { Interface } from 'node:readline/promises'
import { COMMIT_SCOPES, COMMIT_TYPES, MAX_SUBJECT, commitMessage } from '../commits.ts'

interface Change {
  status: string
  /** `[path]`, or `[new, old]` for renames and copies. */
  paths: string[]
}

interface Branch {
  name: string
  current: boolean
  upstream: string
}

interface Answers {
  files: Change[]
  message: string
  target: Branch | null
}

function git(args: string[], capture = false): string {
  const result = spawnSync('git', ['--literal-pathspecs', ...args], {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args[0]} failed.`)
  return result.stdout ?? ''
}

function readChanges(): Change[] {
  const entries = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], true)
    .split('\0')
    .filter(Boolean)

  const changes: Change[] = []
  for (let index = 0; index < entries.length; index++) {
    const status = entries[index].slice(0, 2)
    const paths = [entries[index].slice(3)]
    if (/[RC]/.test(status)) paths.push(entries[++index])
    changes.push({ status, paths })
  }
  return changes
}

function readBranches(): Branch[] {
  return git(
    ['for-each-ref', '--format=%(HEAD) %(refname:short) %(upstream:short)', 'refs/heads'],
    true
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, upstream = ''] = line.slice(2).split(' ')
      return { name, current: line.startsWith('*'), upstream }
    })
}

function changeLabel({ paths }: Change): string {
  return paths.length > 1 ? `${paths[1]} → ${paths[0]}` : paths[0]
}

/** Parses `1 3 5-7` into sorted, unique numbers; `null` when any token is invalid. */
function parseNumbers(input: string, max: number): number[] | null {
  const picked = new Set<number>()
  for (const token of input.split(/[\s,]+/).filter(Boolean)) {
    const parts = token.split('-').map(Number)
    if (parts.length > 2) return null
    const [from, to = from] = parts
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > max || from > to) {
      return null
    }
    for (let n = from; n <= to; n++) picked.add(n)
  }
  return [...picked].sort((a, b) => a - b)
}

async function askFiles(rl: Interface, changes: Change[]): Promise<Change[]> {
  console.log(`\n[1/3] ${changes.length} changed file(s):`)
  changes.forEach((change, index) =>
    console.log(
      `  ${String(index + 1).padStart(3)}) ${change.status.padEnd(2)} ${changeLabel(change)}`
    )
  )

  while (true) {
    const answer = (await rl.question('Files to add [a = all, or e.g. 1 3 5-7]: ')).trim()
    if (!answer || /^(a|all)$/i.test(answer)) return changes

    const picked = parseNumbers(answer, changes.length)
    if (picked?.length) return picked.map((n) => changes[n - 1])

    console.log('✖ Use numbers from the list, e.g. 1 3 5-7.')
  }
}

async function askType(rl: Interface): Promise<string> {
  console.log('\n[2/3] Commit type:')
  COMMIT_TYPES.forEach((entry, index) =>
    console.log(
      `  ${String(index + 1).padStart(2)}) ${entry.emoji} ${entry.type.padEnd(9)} ${entry.hint}`
    )
  )

  while (true) {
    const answer = (await rl.question('Type [1-10 or name, Enter = feat]: ')).trim().toLowerCase()
    if (!answer) return 'feat'

    const byName = COMMIT_TYPES.find((entry) => entry.type === answer)
    if (byName) return byName.type

    const byIndex = COMMIT_TYPES[Number(answer) - 1]
    if (Number.isInteger(Number(answer)) && byIndex) return byIndex.type

    console.log('✖ Unknown type, try again.')
  }
}

async function askScope(rl: Interface): Promise<string> {
  console.log('\nScope:')
  const width = Math.max(...COMMIT_SCOPES.map((entry) => entry.scope.length))
  COMMIT_SCOPES.forEach((entry, index) =>
    console.log(`  ${String(index + 1).padStart(2)}) ${entry.scope.padEnd(width)} ${entry.hint}`)
  )

  while (true) {
    const answer = (await rl.question('Scope [1-N or name, Enter = none]: ')).trim().toLowerCase()
    if (!answer) return ''

    const byName = COMMIT_SCOPES.find((entry) => entry.scope === answer)
    if (byName) return byName.scope

    const byIndex = COMMIT_SCOPES[Number(answer) - 1]
    if (/^\d+$/.test(answer) && byIndex) return byIndex.scope

    console.log('✖ Pick a scope from the list.')
  }
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

async function askTarget(
  rl: Interface,
  branches: Branch[],
  current: Branch
): Promise<Branch | null> {
  console.log('\n[3/3] Push to which branch?')
  const width = Math.max(...branches.map((branch) => branch.name.length))
  branches.forEach((branch, index) => {
    const marker = branch.current ? '*' : ' '
    const upstream = branch.upstream ? `→ ${branch.upstream}` : '(no upstream)'
    console.log(
      `  ${String(index + 1).padStart(2)}) ${marker} ${branch.name.padEnd(width)} ${upstream}`
    )
  })

  while (true) {
    const answer = (
      await rl.question(
        `Branch [1-${branches.length} or name, Enter = ${current.name}, n = skip]: `
      )
    ).trim()
    if (!answer) return current
    if (/^(n|no|skip)$/i.test(answer)) return null

    const byIndex = branches[Number(answer) - 1]
    if (/^\d+$/.test(answer) && byIndex) return byIndex

    const byName = branches.find((branch) => branch.name === answer)
    if (byName) return byName

    console.log('✖ Pick a branch from the list.')
  }
}

async function ask(changes: Change[], branches: Branch[], current: Branch): Promise<Answers> {
  const rl = createInterface({ input: stdin, output: stdout })
  try {
    const files = await askFiles(rl, changes)
    const type = await askType(rl)
    const scope = await askScope(rl)
    const subject = await askSubject(rl)
    const target = await askTarget(rl, branches, current)
    return { files, message: commitMessage(type, scope, subject), target }
  } finally {
    rl.close()
  }
}

async function main(): Promise<void> {
  if (!stdin.isTTY) throw new Error('This script needs an interactive terminal.')

  const changes = readChanges()
  if (!changes.length) {
    console.log('✔ Nothing to commit, the working tree is clean.')
    return
  }

  const branches = readBranches()
  const current = branches.find((branch) => branch.current)
  if (!current) throw new Error('Detached HEAD: check out a branch first.')

  const { files, message, target } = await ask(changes, branches, current)

  const root = git(['rev-parse', '--show-toplevel'], true).trim()
  const paths = files.flatMap((change) => change.paths)
  const present = paths.filter((path) => existsSync(join(root, path)))
  const deleted = paths.filter((path) => !existsSync(join(root, path)))
  if (present.length) git(['add', '-A', '--', ...present])
  if (deleted.length) git(['rm', '--cached', '--quiet', '--ignore-unmatch', '--', ...deleted])
  git(['commit', '-m', message, '--', ...paths])

  const hash = git(['rev-parse', '--short', 'HEAD'], true).trim()
  console.log(`\n✔ Committed ${hash} on ${current.name}: ${message}`)

  if (!target) {
    console.log('✔ Push skipped. Run `git push` when you are ready.')
    return
  }

  if (target.name !== current.name) {
    git(['push', 'origin', `HEAD:refs/heads/${target.name}`])
  } else if (target.upstream) {
    git(['push'])
  } else {
    git(['push', '--set-upstream', 'origin', current.name])
  }
  console.log(`✔ Pushed to origin/${target.name}.`)
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
