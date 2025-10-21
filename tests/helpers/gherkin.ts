import { describe, it } from 'vitest'

interface StepDefinitions {
  Given: (description: string, fn: () => void | Promise<void>) => void
  When: (description: string, fn: () => void | Promise<void>) => void
  Then: (description: string, fn: () => void | Promise<void>) => void
  And: (description: string, fn: () => void | Promise<void>) => void
}

interface FeatureContext {
  Scenario: (scenarioDescription: string, scenarioFn: (steps: StepDefinitions) => void) => void
}

export function Feature(description: string, fn: (context: FeatureContext) => void) {
  describe(`Feature: ${description}`, () => {
    fn({
      Scenario: (scenarioDescription: string, scenarioFn: (steps: StepDefinitions) => void) => {
        it(`Scenario: ${scenarioDescription}`, async () => {
          const steps: Array<{ type: string; description: string; fn: () => void | Promise<void> }> = []
          
          const createStep = (type: string) => (description: string, fn: () => void | Promise<void>) => {
            steps.push({ type, description, fn })
          }

          const stepDefs: StepDefinitions = {
            Given: createStep('Given'),
            When: createStep('When'),
            Then: createStep('Then'),
            And: createStep('And'),
          }

          scenarioFn(stepDefs)

          for (const step of steps) {
            await step.fn()
          }
        })
      },
    })
  })
}
