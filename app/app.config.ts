export default defineAppConfig({
  ui: {
    card: {
      slots: {
        body: 'p-4 sm:p-4'
      }
    },
    tabs: {
      slots: {
        list: 'overflow-x-auto sm:overflow-visible',
        trigger: 'shrink-0 grow-0 whitespace-nowrap sm:grow sm:whitespace-normal'
      }
    }
  }
})
