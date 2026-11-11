<script lang="ts">
  import * as m from '#i18n/messages.js'
  import ModalShell from './modal-shell.svelte'
  import SettingsContent from './settings-content.svelte'

  let {
    showCities,
    onshowcities,
    onreload,
    onclose,
  }: {
    showCities: boolean
    onshowcities: (next: boolean) => void
    onreload?: () => void
    onclose: () => void
  } = $props()
</script>

<ModalShell title={m['settings.label']()} width={520} {onclose}>
  <SettingsContent {showCities} {onshowcities} {onreload} />
</ModalShell>
