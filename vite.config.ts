import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import adapter from '@sveltejs/adapter-node'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { LOCALE_STRATEGY_ID } from '#const'

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
    }),
    paraglideVitePlugin({
      cleanOutdir: true,
      project: './.dovenv/project.inlang',
      outdir: './.dovenv/i18n',
      strategy: [LOCALE_STRATEGY_ID, 'localStorage', 'baseLocale'],
    }),
  ],
})
