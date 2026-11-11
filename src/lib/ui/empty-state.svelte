<script lang="ts">
  interface Props {
    message: string
    icon?: string
    class?: string
  }

  let { message, icon = 'fa-search', class: className = '' }: Props = $props()
</script>

<p class={['empty-state', className]}>
  <i class="fas {icon}" aria-hidden="true"></i>
  <span>{message}</span>
</p>

<style>
  .empty-state {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 2px 8px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty-state i {
    font-size: 10px;
    opacity: 0.7;
  }
</style>
