/**
 * Single source of truth for the commit convention.
 *
 * Shared by the interactive helper (`.dovenv/scripts/push.ts`) and the release
 * config (`.release-it.ts`), so the changelog sections and the types offered by
 * `pnpm push` can never drift apart.
 */

export interface CommitType {
  /** Type used in the subject: `feat(map): ✨ add marker`. */
  readonly type: string
  /** Emoji placed before the description in the subject. */
  readonly emoji: string
  /** One-line description shown by the interactive prompt. */
  readonly hint: string
  /** Changelog section; omitted when the type never reaches `CHANGELOG.md`. */
  readonly section?: string
  /** `conventionalcommits` effect: `bump` (default), `changelog` or `hidden`. */
  readonly effect?: 'bump' | 'changelog' | 'hidden'
}

export const COMMIT_TYPES: readonly CommitType[] = [
  { type: 'feat', emoji: '✨', hint: 'new feature', section: 'Features', effect: 'bump' },
  { type: 'fix', emoji: '🐛', hint: 'bug fix', section: 'Bug Fixes', effect: 'bump' },
  {
    type: 'docs',
    emoji: '📝',
    hint: 'docs only',
    section: 'Documentation',
    effect: 'changelog',
  },
  { type: 'refactor', emoji: '♻️', hint: 'no behaviour change', effect: 'hidden' },
  { type: 'perf', emoji: '⚡️', hint: 'performance', section: 'Performance', effect: 'bump' },
  { type: 'test', emoji: '✅', hint: 'tests', effect: 'hidden' },
  { type: 'build', emoji: '📦️', hint: 'build or deps', effect: 'hidden' },
  { type: 'ci', emoji: '👷', hint: 'CI config', effect: 'hidden' },
  { type: 'chore', emoji: '🔧', hint: 'maintenance', effect: 'hidden' },
  { type: 'style', emoji: '💄', hint: 'formatting', effect: 'hidden' },
]

/** Longest subject `pnpm push` accepts; keeps `git log --oneline` readable. */
export const MAX_SUBJECT = 72

/** `types` for the release-it `conventionalcommits` preset, derived from the table above. */
export const CHANGELOG_TYPES = COMMIT_TYPES.map(({ type, section, effect }) => ({
  type,
  ...(section ? { section } : {}),
  ...(effect && effect !== 'bump' ? { effect } : {}),
}))

/** Builds `feat(map): ✨ add marker` from its parts. */
export function commitMessage(type: string, scope: string, subject: string): string {
  const emoji = COMMIT_TYPES.find((entry) => entry.type === type)?.emoji ?? ''
  return `${type}${scope ? `(${scope})` : ''}: ${emoji} ${subject}`
}
