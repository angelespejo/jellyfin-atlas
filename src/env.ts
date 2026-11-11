import { defineEnvVars } from '@sveltejs/kit/env'

/**
 * Explicit server environment for SvelteKit 3. All variables are optional so
 * the app can still build and run the demo without a `.env` file.
 */
export const variables = defineEnvVars({
  JELLYFIN_URL: {
    description: 'Base URL of the Jellyfin server used by the API proxy.',
    schema: (value) => value,
  },
  JELLYFIN_API_KEY: {
    description: 'API key used by the server to read the Jellyfin library.',
    schema: (value) => value,
  },
  JELLYFIN_USER_ID: {
    description: 'Optional Jellyfin user whose watch state is displayed.',
    schema: (value) => value,
  },
  JELLYFIN_PUBLIC_URL: {
    description: 'Browser-facing Jellyfin URL for deep links (defaults to JELLYFIN_URL).',
    schema: (value) => value,
  },
  JELLYFIN_MOCK: {
    description: 'Set to true to serve the bundled demo library.',
    schema: (value) => value,
  },
})
