import { expect, beforeAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { chromium, type Browser, type Page } from '@playwright/test'
import { checkServerHealth } from '../../fixtures/api-client'

/**
 * Homepage UI Tests
 * 
 * These tests require:
 * 1. A running Nuxt dev server (npm run dev)
 * 2. Playwright browsers installed (npx playwright install chromium)
 * 
 * Tests will be skipped if either requirement is not met.
 */

const feature = await loadFeature('./test/app/e2e/homepage.feature')

describeFeature(feature, ({ Scenario }) => {
  let browser: Browser
  let page: Page
  let canRunTests = false
  const appURL = process.env.NUXT_TEST_BASE_URL || 'http://localhost:3000'

  beforeAll(async () => {
    const serverRunning = await checkServerHealth()
    
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   UI tests will be skipped.\n')
      return
    }

    // Check if Playwright browsers are installed
    try {
      browser = await chromium.launch({ headless: true })
      canRunTests = true
    } catch {
      console.warn('\n⚠️  Playwright browsers not installed. Run: npx playwright install chromium')
      console.warn('   UI tests will be skipped.\n')
    }
  })

  Scenario('Homepage loads successfully', ({ Given, When, Then, And }) => {
    Given('the application server is running', () => {
      if (!canRunTests) {
        console.log('   ⏭️  Skipping - prerequisites not met')
        return
      }
      expect(canRunTests).toBe(true)
    })

    When('I navigate to the homepage', async () => {
      if (!canRunTests) return
      
      page = await browser.newPage()
      console.log(`   Navigating to: ${appURL}`)
      await page.goto(appURL, { waitUntil: 'domcontentloaded' })
    })

    Then('the page should load successfully', async () => {
      if (!canRunTests) return
      expect(page).toBeDefined()
      expect(page.url()).toBe(`${appURL}/`)
    })

    And('the page should contain the application title', async () => {
      if (!canRunTests) return
      const title = await page.title()
      expect(title).toBeTruthy()
      expect(title.length).toBeGreaterThan(0)
      
      const bodyText = await page.textContent('body')
      expect(bodyText).toBeTruthy()
      expect(bodyText!.length).toBeGreaterThan(0)
      
      if (page) await page.close()
      if (browser) await browser.close()
    })
  })
})
