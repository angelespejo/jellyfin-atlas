<script lang="ts">
  import type { KbdProps } from './types'

  let { value, class: klass, ...rest }: KbdProps = $props()

  const key = $derived.by(() => {
    const normalized = value.trim().toLowerCase()
    return normalized.startsWith('key') ? normalized.slice(3) : normalized
  })
</script>

<kbd {...rest} class={['kbd', klass]}>
  {#if key === 'cmd' || key === '⌘' || key === 'command'}
    ⌘
  {:else if key === 'comma'}
    ,
  {:else}
    {key}
  {/if}
</kbd>
