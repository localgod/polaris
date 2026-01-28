export default defineAppConfig({
  ui: {
    prose: {
      h1: {
        slots: {
          base: 'text-3xl text-highlighted font-bold mb-6'
        }
      },
      h2: {
        slots: {
          base: 'text-2xl text-highlighted font-bold mt-8 mb-4'
        }
      },
      h3: {
        slots: {
          base: 'text-xl text-highlighted font-semibold mt-6 mb-3'
        }
      },
      h4: {
        slots: {
          base: 'text-lg text-highlighted font-semibold mt-4 mb-2'
        }
      },
      p: {
        base: 'my-4 leading-7 text-muted'
      }
    }
  }
})
