/**
 * Single source of truth for the commit convention.
 *
 * Shared by the interactive helper (`.dovenv/scripts/push.ts`) and the release
 * config (`.release-it.ts`), so the changelog sections and the types offered by
 * `pnpm push` can never drift apart.
 */

export interface CommitType {
  /** Type used in the subject: `feat(map): add marker`. */
  readonly type: string
  /** One-line description shown by the interactive prompt. */
  readonly hint: string
  /** Changelog section; omitted when the type never reaches `CHANGELOG.md`. */
  readonly section?: string
  /** `conventionalcommits` effect: `bump` (default), `changelog` or `hidden`. */
  readonly effect?: 'bump' | 'changelog' | 'hidden'
}

export const COMMIT_TYPES: readonly CommitType[] = [
  { type: 'feat', hint: 'new feature', section: 'Features', effect: 'bump' },
  { type: 'fix', hint: 'bug fix', section: 'Bug Fixes', effect: 'bump' },
  { type: 'docs', hint: 'docs only', section: 'Documentation', effect: 'changelog' },
  { type: 'refactor', hint: 'no behaviour change', effect: 'hidden' },
  { type: 'perf', hint: 'performance', section: 'Performance', effect: 'bump' },
  { type: 'test', hint: 'tests', effect: 'hidden' },
  { type: 'build', hint: 'build or deps', effect: 'hidden' },
  { type: 'ci', hint: 'CI config', effect: 'hidden' },
  { type: 'chore', hint: 'maintenance', effect: 'hidden' },
  { type: 'style', hint: 'formatting', effect: 'hidden' },
]

/** Longest subject `pnpm push` accepts; keeps `git log --oneline` readable. */
export const MAX_SUBJECT = 72

/** `types` for the release-it `conventionalcommits` preset, derived from the table above. */
export const CHANGELOG_TYPES = COMMIT_TYPES.map(({ type, section, effect }) => ({
  type,
  ...(section ? { section } : {}),
  ...(effect && effect !== 'bump' ? { effect } : {}),
}))

/** Builds `feat(map): add marker` from its three parts. */
export function commitMessage(type: string, scope: string, subject: string): string {
  return `${type}${scope ? `(${scope})` : ''}: ${subject}`
}
