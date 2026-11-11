<script lang="ts">
  import '../app.css'
  import 'svelte-ripple-action/ripple.css'
  import { i18n, initI18n, initTheme } from '#core'

  initI18n()
  initTheme()

  let { children } = $props()
</script>

{#key i18n.locale}
  {@render children()}
{/key}
