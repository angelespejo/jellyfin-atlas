import { expect, test } from '@playwright/test'

/**
 * Smoke coverage for the demo library: every view renders real content and the
 * shared panels/lists work (title details, person filmography search, country
 * filter search, exports and the demo badge).
 */

test('library, title dialog and filmography search', async ({ page }) => {
  await page.goto('/?view=map&sidebar=open')

  const firstTitle = page.locator('.movie-item').first()
  await expect(firstTitle).toBeVisible({ timeout: 30_000 })
  await firstTitle.click()

  await expect(page.locator('.detail-panel.visible')).toBeVisible()
  await page.locator('.detail-panel .person-chip').first().click()

  const personPanel = page.locator('.person-panel')
  await expect(personPanel).toBeVisible()

  // The filmography row is the same reusable component as the sidebar one.
  const credit = personPanel.locator('.person-credits .movie-item').first()
  await expect(credit).toBeVisible({ timeout: 15_000 })
  await expect(credit.locator('.type-badge')).toBeVisible()

  const search = personPanel.locator('#person-credit-search')
  await expect(search).toBeVisible()
  await search.fill('zzzz-no-match')
  await expect(personPanel.locator('.empty-state')).toBeVisible()
  await search.fill('')
  await expect(personPanel.locator('.person-credits .movie-item').first()).toBeVisible()

  await personPanel.locator('.person-close').click()
  await expect(personPanel).toHaveCount(0)
  await page.locator('.detail-close button').click()
})

test('country drawer search filters its titles', async ({ page }) => {
  await page.goto('/?view=chart&sidebar=closed')

  const bar = page.locator('.bar-main').first()
  await expect(bar).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.bar-info')).toHaveCount(0)

  await bar.click()
  const popover = page.locator('.chart-popover')
  await expect(popover).toBeVisible()
  await popover.locator('.popup-action.ghost').click()

  const panel = page.locator('.country-panel')
  await expect(panel).toBeVisible()
  await expect(panel.locator('.panel-stats')).toBeVisible()
  await expect(panel.locator('.country-movies .movie-item').first()).toBeVisible()

  const search = panel.locator('#country-title-search')
  await search.fill('zzzz-no-match')
  await expect(panel.locator('.empty-state')).toBeVisible()
  await search.fill('')
  await expect(panel.locator('.country-movies .movie-item').first()).toBeVisible()
})

test('person chip menu stays open when moving into it', async ({ page }) => {
  await page.goto('/?view=map&sidebar=open')
  await page.locator('.movie-item').first().waitFor({ timeout: 30_000 })
  await page.locator('.movie-item').first().click()

  const panel = page.locator('.detail-panel.visible')
  await expect(panel).toBeVisible()
  const chip = panel.locator('.person-chip').first()
  await chip.hover()

  const options = panel.locator('.person-options').first()
  await expect(options).toBeVisible()

  const chipBox = (await chip.boundingBox())!
  await page.mouse.move(chipBox.x + 10, chipBox.y + chipBox.height - 1)
  await page.mouse.move(chipBox.x + 10, chipBox.y + chipBox.height + 3)
  await expect(options).toBeVisible()

  const optionsBox = (await options.boundingBox())!
  await page.mouse.move(optionsBox.x + 10, optionsBox.y + 10)
  await expect(options).toBeVisible()

  await options.locator('button').last().click()
  await expect(page.locator('.person-panel')).toBeVisible()
})

test('unknown location is visible in every view', async ({ page }) => {
  await page.goto('/?view=chart&sidebar=closed')
  const unknown = page.locator('.bar-row', { hasText: 'No location' })
  await expect(unknown).toHaveCount(1, { timeout: 30_000 })
  await expect(unknown.locator('.bar-count')).toHaveText('24')

  await unknown.locator('.bar-main').click()
  const popover = page.locator('.chart-popover')
  await expect(popover).toBeVisible()
  await expect(popover.locator('.popup-action.ghost')).toContainText('Show more details')
  await popover.locator('.popup-action.ghost').click({ force: true })

  const panel = page.locator('.country-panel')
  await expect(panel).toBeVisible()
  await expect(panel.locator('h2')).toHaveText('No location')
  await expect(panel.locator('.movie-item').first()).toBeVisible()

  await page.goto('/?view=table&sidebar=closed')
  await expect(page.locator('td.col-countries', { hasText: 'No location' }).first()).toBeVisible({
    timeout: 30_000,
  })
})

test('tooltips are CSS positioned and keep the shortcut key', async ({ page }) => {
  await page.goto('/?view=map&sidebar=open')
  const button = page.locator('.action-rail .action-btn').first()
  await button.hover()

  const tooltip = button.locator('.tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('kbd')).toBeVisible()
  await expect(tooltip).toContainText(/K$/)

  const buttonBox = (await button.boundingBox())!
  const tooltipBox = (await tooltip.boundingBox())!
  expect(tooltipBox.x).toBeGreaterThan(buttonBox.x + buttonBox.width)
})

test('sidebar closes when clicking outside', async ({ page }) => {
  await page.goto('/?view=map&sidebar=open')
  const sidebar = page.locator('#sidebar')
  await expect(sidebar).toHaveClass(/open/)

  await page.locator('.map-layer').click({ position: { x: 700, y: 400 } })
  await expect(sidebar).not.toHaveClass(/open/)
})

test('detail panel links to Jellyfin Web with the public URL', async ({ page }) => {
  await page.goto('/?view=map&sidebar=open')
  await page.locator('.movie-item').first().waitFor({ timeout: 30_000 })
  await page.locator('.movie-item').first().click()

  const watch = page.locator('.detail-panel.visible .detail-watch')
  await expect(watch).toBeVisible()
  await expect(watch).toHaveAttribute('href', /^http:\/\/localhost:8096\/web\/#\/details\?id=/)
})

test('chart sub-tab is kept in the URL', async ({ page }) => {
  await page.goto('/?view=chart&chart=timeline&sidebar=closed')
  await expect(page.locator('.timeline')).toBeVisible({ timeout: 30_000 })
  expect(new URL(page.url()).searchParams.get('chart')).toBe('timeline')

  await page.locator('.chart-tab').first().click()
  await expect(page.locator('.bar-main').first()).toBeVisible()
  expect(new URL(page.url()).searchParams.has('chart')).toBe(false)

  await page.reload()
  await expect(page.locator('.bar-main').first()).toBeVisible({ timeout: 30_000 })
})

test('chart, graph and table views render', async ({ page }) => {
  await page.goto('/?view=chart&sidebar=closed')
  await expect(page.locator('.chart-view .bar-main').first()).toBeVisible({ timeout: 30_000 })

  await page.locator('.chart-tab').nth(1).click()
  await expect(page.locator('.timeline')).toBeVisible()

  await page.goto('/?view=graph&sidebar=closed')
  await expect(page.locator('.graph-view canvas')).toBeVisible({ timeout: 30_000 })

  await page.goto('/?view=table&sidebar=closed')
  await expect(page.locator('.table-view table tbody tr').first()).toBeVisible({
    timeout: 30_000,
  })
})

test('health endpoint and demo badge', async ({ page, request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.mock).toBe(true)
  expect(body.status).toBe('ok')

  await page.goto('/?view=map&sidebar=closed')
  await page.locator('[data-dialog="about"]').click()
  const modal = page.locator('.modal-shell')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.badge.demo')).toBeVisible()
})

test('table menus close when clicking outside', async ({ page }) => {
  await page.goto('/?view=table&sidebar=closed')
  const menus = page.locator('.table-menu')
  await expect(menus.first().locator('summary')).toBeVisible({ timeout: 30_000 })

  await menus.first().locator('summary').click()
  await expect(menus.first()).toHaveAttribute('open', '')

  // Clicking inside the panel keeps it open.
  await menus
    .first()
    .locator('.menu-panel')
    .click({ position: { x: 4, y: 4 } })
  await expect(menus.first()).toHaveAttribute('open', '')

  // Clicking elsewhere in the view closes it.
  await page.locator('.table-view thead').click({ position: { x: 5, y: 5 } })
  await expect(menus.first()).not.toHaveAttribute('open', '')

  // Opening another menu closes the previous one.
  await menus.first().locator('summary').click()
  await menus.nth(1).locator('summary').click()
  await expect(menus.first()).not.toHaveAttribute('open', '')
  await expect(menus.nth(1)).toHaveAttribute('open', '')
})
