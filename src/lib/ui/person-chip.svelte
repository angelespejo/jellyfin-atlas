<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { ui, type ActivePerson } from '#core'

  let {
    person,
    onfilter,
  }: {
    person: ActivePerson
    onfilter?: () => void
  } = $props()

  const icon = $derived(person.type === 'Director' ? 'video' : 'user')

  function openDetails() {
    ui.activePerson = person
  }

  function filter() {
    onfilter?.()
  }
</script>

<div class="person-chip-wrap">
  <button
    class="person-chip"
    type="button"
    onclick={openDetails}
    aria-label={m['person.open']({ name: person.name })}
  >
    <i class="fas fa-{icon}"></i>
    {person.name}
    {#if person.role}
      <span class="person-role">{person.role}</span>
    {/if}
  </button>

  <div class="person-options">
    {#if onfilter}
      <button type="button" onclick={filter}>
        <i class="fas fa-filter"></i>
        {m['person.filter']()}
      </button>
    {/if}
    <button type="button" onclick={openDetails}>
      <i class="fas fa-circle-info"></i>
      {m['person.details']()}
    </button>
  </div>
</div>

<style>
  .person-chip-wrap {
    position: relative;
    display: inline-flex;
  }

  .person-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 11px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      color 0.15s;
  }

  .person-chip:hover,
  .person-chip:focus-visible {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    outline: none;
  }

  .person-chip i {
    font-size: 10px;
    opacity: 0.7;
  }

  .person-role {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.75;
  }

  .person-options {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    display: none;
    flex-direction: column;
    gap: 2px;
    min-width: 160px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    box-shadow: var(--shadow-panel);
  }

  /* Invisible bridge over the gap so moving the pointer from the chip to the
     menu keeps `.person-chip-wrap:hover` active. */
  .person-options::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 0;
    left: 0;
    height: 6px;
  }

  .person-chip-wrap:hover .person-options,
  .person-chip-wrap:focus-within .person-options {
    display: flex;
  }

  .person-options button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .person-options button:hover,
  .person-options button:focus-visible {
    background: var(--card-hover);
    color: var(--accent);
    outline: none;
  }

  .person-options i {
    width: 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .person-chip {
      transition: none;
    }
  }
</style>
