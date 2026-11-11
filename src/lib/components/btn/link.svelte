<script lang="ts">
  import Content from './content.svelte'
  import type { ButtonLinkProps } from './types'
  import { ripple } from '#lib'

  let {
    icon,
    iconPosition,
    // @ts-ignore
    href,
    children,
    color = 'primary',
    shadow = false,
    class: klass,
    ...rest
  }: ButtonLinkProps = $props()
</script>

<a
  {href}
  {...rest}
  class={[`button--${color}`, 'button', shadow ? 'button--shadow' : '', 'button', klass]}
  use:ripple
>
  <Content {icon} {iconPosition}>
    {@render children?.()}
  </Content>
</a>
