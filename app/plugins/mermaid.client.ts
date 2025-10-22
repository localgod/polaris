import mermaid from 'mermaid'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.client) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    })

    const renderMermaid = async () => {
      const mermaidBlocks = document.querySelectorAll('pre.language-mermaid:not(.mermaid-rendered)')
      
      for (const pre of Array.from(mermaidBlocks)) {
        const code = pre.querySelector('code')
        if (!code) continue
        
        const mermaidCode = code.textContent || ''
        
        try {
          // Create a container for the mermaid diagram
          const container = document.createElement('div')
          container.className = 'mermaid-container my-8 bg-white p-6 rounded-lg border border-gray-200 overflow-x-auto flex justify-center items-center'
          container.style.minHeight = '200px'
          
          // Generate unique ID for this diagram
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          // Render the diagram
          const { svg } = await mermaid.render(id, mermaidCode)
          container.innerHTML = svg
          
          // Replace the pre block with the rendered diagram
          pre.replaceWith(container)
          pre.classList.add('mermaid-rendered')
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          const errorDiv = document.createElement('div')
          errorDiv.className = 'my-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'
          errorDiv.innerHTML = `<strong>Error rendering diagram:</strong><br><pre class="mt-2 text-sm">${error}</pre>`
          pre.replaceWith(errorDiv)
        }
      }
    }

    // Render on page load
    nuxtApp.hook('page:finish', () => {
      setTimeout(renderMermaid, 100)
    })

    // Initial render
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(renderMermaid, 100))
    } else {
      setTimeout(renderMermaid, 100)
    }
  }
})
