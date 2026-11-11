import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import adapter from '@sveltejs/adapter-node'
import pkg from './package.json' with { type: 'json' }
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { LOCALE_STRATEGY_ID } from './src/const/locale.ts'

export const APP_DATA = {
  PKG: pkg,
}
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

  define: { APP_DATA },
})
