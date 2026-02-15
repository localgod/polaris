import { h } from 'vue'
import type { Column } from '@tanstack/vue-table'
import { UDropdownMenu, UButton } from '#components'

/**
 * Returns a render function for sortable column headers.
 * Uses UDropdownMenu with Asc/Desc checkboxes and a UButton trigger.
 */
export function useSortableTable() {

  function getSortableHeader<T>(column: Column<T>, label: string) {
    const isSorted = column.getIsSorted()

    return h(UDropdownMenu, {
      content: { align: 'start' as const },
      items: [
        {
          label: 'Asc',
          type: 'checkbox' as const,
          icon: 'i-lucide-arrow-up-narrow-wide',
          checked: isSorted === 'asc',
          onSelect: () => {
            if (isSorted === 'asc') {
              column.clearSorting()
            } else {
              column.toggleSorting(false)
            }
          }
        },
        {
          label: 'Desc',
          type: 'checkbox' as const,
          icon: 'i-lucide-arrow-down-wide-narrow',
          checked: isSorted === 'desc',
          onSelect: () => {
            if (isSorted === 'desc') {
              column.clearSorting()
            } else {
              column.toggleSorting(true)
            }
          }
        }
      ]
    }, () => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label,
      icon: isSorted
        ? isSorted === 'asc'
          ? 'i-lucide-arrow-up-narrow-wide'
          : 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down',
      class: '-mx-2.5 data-[state=open]:bg-elevated'
    }))
  }

  return { getSortableHeader }
}
