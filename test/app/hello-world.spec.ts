import { expect } from 'vitest'
import { Feature } from '../helpers/gherkin'

Feature('Hello World API Test', ({ Scenario }) => {
  let greeting: string
  let name: string
  let result: string

  Scenario('Simple greeting generation', ({ Given, When, Then, And }) => {
    Given('I have a name "World"', () => {
      name = 'World'
      expect(name).toBeDefined()
    })

    When('I create a greeting', () => {
      greeting = 'Hello'
      result = `${greeting}, ${name}!`
    })

    Then('the result should be "Hello, World!"', () => {
      expect(result).toBe('Hello, World!')
    })

    And('the greeting should contain the name', () => {
      expect(result).toContain(name)
    })
  })

  Scenario('Custom greeting', ({ Given, When, Then }) => {
    Given('I have a custom name "Vitest"', () => {
      name = 'Vitest'
    })

    When('I create a greeting with "Welcome"', () => {
      greeting = 'Welcome'
      result = `${greeting}, ${name}!`
    })

    Then('the result should be "Welcome, Vitest!"', () => {
      expect(result).toBe('Welcome, Vitest!')
    })
  })
})
