import { expect, test } from '@playwright/test'

const ICONIFY_HOSTS = /https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)\//

for (const iconsLucide of [false, true]) {
  for (const iconsRounded of [false, true]) {
    const flags = { iconsLucide, iconsRounded }
    const label = `${iconsLucide}/${iconsRounded}`

    test(`local header icons: ${label}`, async ({ page }) => {
      const attempts: string[] = []
      await page.addInitScript(value => {
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(value))
      }, flags)
      await page.route(ICONIFY_HOSTS, async route => {
        attempts.push(route.request().url())
        await route.abort()
      })
      await page.goto('/')
      const volume = page.getByTestId('volume-button')
      const icon = volume.locator('span.sp-icon-root')
      await expect(icon).toBeVisible()
      expect(await icon.evaluate(node => {
        const style = getComputedStyle(node)
        return style.maskImage !== 'none' || style.webkitMaskImage !== 'none'
      })).toBe(true)
      await volume.click()
      await expect(page.getByTestId('volume-slider')).toBeVisible()
      expect(attempts).toEqual([])
    })

    test(`local icons on public routes: ${label}`, async ({ page }) => {
      const attempts: string[] = []
      await page.addInitScript(value => {
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(value))
      }, flags)
      await page.route(ICONIFY_HOSTS, async route => {
        attempts.push(route.request().url())
        await route.abort()
      })
      for (const path of ['/', '/login', '/ffc']) {
        await page.goto(path)
        const icons = page.locator('span.sp-icon-root')
        await expect(icons.first()).toBeVisible()
        const empty = await icons.evaluateAll(nodes => nodes.filter(node => {
          if (node.classList.contains('sp-icon-inline')) return node.childElementCount === 0
          const style = getComputedStyle(node)
          return style.maskImage === 'none' && style.webkitMaskImage === 'none'
        }).length)
        expect(empty).toBe(0)
      }
      expect(attempts).toEqual([])
    })
  }
}
