<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'

  import Notification from './main.svelte'
  import { notifications } from './use'

  import type { HTMLAttributes } from 'svelte/elements'

  let { ...rest }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div class={['toaster', !$notifications.length && 'hidden', rest.class]}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  {#each $notifications as notification (notification.id)}
    <div
      onmouseenter={() => notifications.pause(notification.id)}
      onmouseleave={() => notifications.resume(notification.id)}
      transition:fly={{ y: -30 }}
      animate:flip
    >
      <Notification id={notification.id} type={notification.type}>
        <p>{notification.message}</p>
        <!-- <Button
					class="small dark absolute top-2 bottom-2 right-3"
					icon="i-fa6-solid:xmark"
					onclick={() => notifications.remove( notification.id )}
				/> -->
      </Notification>
    </div>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    top: calc(16px + env(safe-area-inset-top, 0px));
    right: calc(16px + env(safe-area-inset-right, 0px));
    z-index: 800;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(390px, calc(100vw - 32px));
    pointer-events: none;
  }

  .toaster.hidden {
    visibility: hidden;
  }

  .toaster > :global(*) {
    pointer-events: auto;
  }

  .toaster :global(.notification) {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: 14px;
    background: var(--panel-bg);
    color: var(--text);
    box-shadow: var(--shadow-panel);
    backdrop-filter: blur(16px);
    font-size: 13px;
    line-height: 1.5;
  }

  .toaster :global(.notification.success) {
    border-left-color: var(--green);
  }

  .toaster :global(.notification.warn) {
    border-left-color: var(--yellow);
  }

  .toaster :global(.notification.error) {
    border-left-color: var(--red);
  }

  .toaster :global(.notification__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--accent);
  }

  .toaster :global(.notification.success .notification__icon) {
    color: var(--green);
  }

  .toaster :global(.notification.warn .notification__icon) {
    color: var(--yellow);
  }

  .toaster :global(.notification.error .notification__icon) {
    color: var(--red);
  }

  @media (max-width: 480px) {
    .toaster {
      top: calc(10px + env(safe-area-inset-top, 0px));
      right: calc(10px + env(safe-area-inset-right, 0px));
      width: calc(100vw - 20px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
    }
  }
</style>
