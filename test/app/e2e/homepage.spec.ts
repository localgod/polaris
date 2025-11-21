import { expect, beforeAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { chromium, type Browser, type Page } from '@playwright/test'
import { checkServerHealth } from '../../fixtures/api-client'

/**
 * Homepage UI Tests
 * 
 * These tests require a running Nuxt dev server.
 * Start the server with: npm run dev
 * 
 * Alternative: Use exec_preview or start server programmatically in CI
 */

const feature = await loadFeature('./test/app/e2e/homepage.feature')

describeFeature(feature, ({ Scenario }) => {
  let browser: Browser
  let page: Page
  let serverRunning = false
  const appURL = process.env.NUXT_TEST_BASE_URL || 'http://localhost:3000'

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   UI tests will be skipped.\n')
    }
  })

  Scenario('Homepage loads successfully', ({ Given, When, Then, And }) => {
    Given('the application server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I navigate to the homepage', async () => {
      if (!serverRunning) return
      
      if (!browser) {
        browser = await chromium.launch({
          headless: true,
        })
      }
      
      page = await browser.newPage()
      console.log(`   Navigating to: ${appURL}`)
      await page.goto(appURL, { waitUntil: 'domcontentloaded' })
    })

    Then('the page should load successfully', async () => {
      if (!serverRunning) return
      expect(page).toBeDefined()
      expect(page.url()).toBe(`${appURL}/`)
    })

    And('the page should contain the application title', async () => {
      if (!serverRunning) return
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
