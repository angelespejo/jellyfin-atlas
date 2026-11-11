<script lang="ts">
  import { NOTIFICATION_ICON, NOTIFICATION_TYPE } from './const'

  import type { NotificationType } from './types'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    id = '',
    type = NOTIFICATION_TYPE.info,
    children,
    class: klass,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    id?: string
    type?: NotificationType
    children?: Snippet
  } = $props()
</script>

<div {id} role="alert" {...rest} class={['notification', type, klass]}>
  <span class={['notification__icon', NOTIFICATION_ICON[type]]}></span>
  <div class="notification__content">
    {@render children?.()}
  </div>
</div>
