<script lang="ts">
  import { page } from '$app/state'

  import { ButtonLink } from '#lib'

  let status = $derived(page.status)
  let message = $derived(status === 404 ? 'Page not found' : 'Unexpected error')
  let hint = $derived(
    status === 404
      ? 'The page you are looking for does not exist or has been moved.'
      : 'Something went wrong. Please try again.'
  )
</script>

<div class="error-page">
  <div class="error-card">
    <div class="error-code">{status}</div>
    <h1 class="error-title">{message}</h1>
    <p class="error-desc">{hint}</p>
    <ButtonLink class="error-link" href="/" icon={{ src: 'fas fa-arrow-left' }}>Go home</ButtonLink>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg);
    padding: 20px;
  }

  .error-card {
    text-align: center;
    max-width: 400px;
  }

  .error-code {
    font-size: 96px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 8px;
    letter-spacing: -4px;
    opacity: 0.7;
  }

  .error-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text);
  }

  .error-desc {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 28px;
  }

  :global(.error-link) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    &:hover {
      background: #994fb0;
      box-shadow: 0 0 24px var(--accent-glow);
    }
  }
</style>
