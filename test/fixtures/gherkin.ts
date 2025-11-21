import { describe, it } from 'vitest'

type StepFunction<T = undefined> = T extends undefined
  ? (() => void | Promise<void>) 
  : ((data: T) => void | Promise<void>)

interface StepDefinitions {
  Given: <T = undefined>(description: string, fn: StepFunction<T>) => void
  When: <T = undefined>(description: string, fn: StepFunction<T>) => void
  Then: <T = undefined>(description: string, fn: StepFunction<T>) => void
  And: <T = undefined>(description: string, fn: StepFunction<T>) => void
}

interface FeatureContext {
  Scenario: (scenarioDescription: string, scenarioFn: (steps: StepDefinitions) => void) => void
}

export function Feature(description: string, fn: (context: FeatureContext) => void) {
  describe(`Feature: ${description}`, () => {
    fn({
      Scenario: (scenarioDescription: string, scenarioFn: (steps: StepDefinitions) => void) => {
        it(`Scenario: ${scenarioDescription}`, async () => {
          const steps: Array<{ type: string; description: string; fn: StepFunction<unknown> }> = []
          
          const createStep = (type: string) => <T = undefined>(description: string, fn: StepFunction<T>) => {
            steps.push({ type, description, fn: fn as StepFunction<unknown> })
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
