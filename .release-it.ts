import { CHANGELOG_TYPES } from './.dovenv/commits.ts'

/**
 * release-it configuration.
 *
 * Commit types, changelog sections and hidden types live in `.dovenv/commits.ts`
 * and are shared with `pnpm push`, so both always agree.
 */
export default {
  git: {
    commit: true,
    commitMessage: 'chore(release): v${version}',
    tag: true,
    push: true,
  },
  github: {
    release: true,
    releaseName: 'v${version}',
  },
  npm: {
    publish: false,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      header:
        '# Changelog\n\nAll notable changes to JellyFin Atlas are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).',
      preset: {
        name: 'conventionalcommits',
        types: CHANGELOG_TYPES,
      },
    },
  },
  hooks: {
    'before:init': ['pnpm check'],
  },
}
