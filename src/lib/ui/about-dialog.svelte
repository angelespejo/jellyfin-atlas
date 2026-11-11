<script lang="ts">
  import * as m from '#i18n/messages.js'
  import AboutContent from './about-content.svelte'
  import ModalShell from './modal-shell.svelte'

  let { onclose }: { onclose: () => void } = $props()
</script>

<ModalShell title={m['info.title']()} width={580} {onclose}>
  <AboutContent />
</ModalShell>
