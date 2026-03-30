import { chromium, type Browser, type Page, type BrowserContext } from 'playwright-core'

interface ScrapedData {
  title: string
  text: string
  links: string[]
}

interface AutomationAction {
  action: 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot'
  selector?: string
  value?: string
  direction?: 'up' | 'down'
  amount?: number
  timeout?: number
}

export class PlaywrightBridge {
  private browser?: Browser

  /**
   * Ensure the browser is launched
   */
  async ensureBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser
    }

    // Launch Chromium in headless mode
    this.browser = await chromium.launch({
      headless: true,
    })

    return this.browser
  }

  /**
   * Scrape page content including title, text, and links
   */
  async scrapePage(url: string): Promise<ScrapedData> {
    const browser = await this.ensureBrowser()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle' })

      // Extract page data
      const title = await page.title()

      // Get text content from main content areas
      const text = await page.evaluate(() => {
        const selectors = [
          'article',
          'main',
          '[role="main"]',
          '.content',
          '#content',
          'body'
        ]

        for (const selector of selectors) {
          const el = document.querySelector(selector)
          if (el) {
            return el.innerText || el.textContent || ''
          }
        }

        return document.body?.innerText || document.body?.textContent || ''
      })

      // Get all links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href.startsWith('http'))
      })

      return {
        title,
        text: text.trim(),
        links: [...new Set(links)], // Deduplicate
      }
    } finally {
      await context.close()
    }
  }

  /**
   * Take a screenshot of a page or specific element
   */
  async screenshot(url: string, selector?: string): Promise<Buffer> {
    const browser = await this.ensureBrowser()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle' })

      let screenshot: Buffer

      if (selector) {
        // Screenshot specific element
        const element = await page.locator(selector).first()
        screenshot = await element.screenshot({ type: 'png' })
      } else {
        // Full page screenshot
        screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
        })
      }

      return screenshot
    } finally {
      await context.close()
    }
  }

  /**
   * Run a sequence of whitelisted automation actions
   * Actions are validated - no raw JavaScript execution allowed
   */
  async runAutomation(url: string, actions: AutomationAction[]): Promise<unknown> {
    const browser = await this.ensureBrowser()
    const context = await browser.newContext()
    const page = await context.newPage()

    const results: unknown[] = []

    try {
      await page.goto(url, { waitUntil: 'networkidle' })

      for (const action of actions) {
        // Validate action type
        if (!this.isValidAction(action)) {
          throw new Error(`Invalid automation action: ${action.action}`)
        }

        const result = await this.executeAction(page, action)
        results.push(result)
      }

      return results
    } finally {
      await context.close()
    }
  }

  /**
   * Validate that an action is in the whitelist
   */
  private isValidAction(action: AutomationAction): boolean {
    const validActions = ['click', 'fill', 'scroll', 'wait', 'screenshot']
    return validActions.includes(action.action)
  }

  /**
   * Execute a single whitelisted action
   */
  private async executeAction(page: Page, action: AutomationAction): Promise<unknown> {
    switch (action.action) {
      case 'click': {
        if (!action.selector) throw new Error('Click action requires selector')
        await page.locator(action.selector).first().click()
        return { success: true, action: 'click', selector: action.selector }
      }

      case 'fill': {
        if (!action.selector) throw new Error('Fill action requires selector')
        if (action.value === undefined) throw new Error('Fill action requires value')
        await page.locator(action.selector).first().fill(action.value)
        return { success: true, action: 'fill', selector: action.selector }
      }

      case 'scroll': {
        const direction = action.direction || 'down'
        const amount = action.amount || 500

        if (direction === 'down') {
          await page.evaluate((y) => window.scrollBy(0, y), amount)
        } else {
          await page.evaluate((y) => window.scrollBy(0, -y), amount)
        }

        return { success: true, action: 'scroll', direction, amount }
      }

      case 'wait': {
        const timeout = action.timeout || 1000
        await page.waitForTimeout(timeout)
        return { success: true, action: 'wait', timeout }
      }

      case 'screenshot': {
        const screenshot = await page.screenshot({ type: 'png' })
        return {
          success: true,
          action: 'screenshot',
          dataUrl: `data:image/png;base64,${screenshot.toString('base64')}`,
        }
      }

      default:
        throw new Error(`Unknown action: ${action.action}`)
    }
  }

  /**
   * Close the browser and clean up resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = undefined
    }
  }
}
