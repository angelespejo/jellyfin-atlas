<script lang="ts">
  import Content from './content.svelte'

  import type { ButtonProps } from './types'

  import { ripple } from '#lib'

  let {
    icon,
    iconPosition,
    children,
    color = 'primary',
    shadow = false,
    disabled = $bindable(false),
    class: klass,
    ...rest
  }: ButtonProps = $props()
</script>

<button
  {@attach (e) => {
    !e.hasAttribute('disabled') ? ripple(e) : null
  }}
  {disabled}
  type="button"
  {...rest}
  class={[`button--${color}`, 'button', shadow ? 'button--shadow' : '', 'button', klass]}
>
  <Content {icon} {iconPosition}>
    {@render children?.()}
  </Content>
</button>
