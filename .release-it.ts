import { CHANGELOG_TYPES } from './.dovenv/commits.ts'

/**
 * release-it configuration.
 *
 * Commit types, changelog sections and hidden types live in `.dovenv/commits.ts`
 * and are shared with `pnpm push`, so both always agree.
 */
export default {
  plugins: {
    '@release-it/bumper': {
      in: ['.package.json'],
      out: ['.package.json'],
    },
  },
  git: {
    requireBranch: 'main',
    commitMessage: ':construction_worker: chore(release): v${version}',
    tag: true,
    tagName: 'v${version}',
    push: true,
  },
  github: {
    release: true,
    releaseName: 'v${version}',
  },
  npm: {
    publish: false,
  },
  hooks: {
    'before:init': ['pnpm check'],
    'after:bump': 'pnpm auto-changelog -p',
    'after:git:release': "echo 'After git push, before github release'",
    'after:release': [
      'echo "GitHub action is now releasing: ${name} v${version} to ${repo.repository}.\\n Check if all is ok 🌈🤖\\n https://github.com/${repo.repository}/actions"',
    ],
  },
}
