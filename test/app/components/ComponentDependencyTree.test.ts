// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import ComponentDependencyTree from '../../../app/components/ComponentDependencyTree.vue'
import type { DependencyNode, DependencyTreeResponse } from '../../../types/api'

const rootA: DependencyNode = {
  name: 'alpha',
  group: null,
  version: '1.0.0',
  packageManager: 'npm',
  purl: 'pkg:npm/alpha@1.0.0',
  scope: 'runtime',
  isDirect: true,
  depth: 1
}

const rootB: DependencyNode = {
  name: 'beta',
  group: null,
  version: '1.0.0',
  packageManager: 'npm',
  purl: 'pkg:npm/beta@1.0.0',
  scope: 'dev',
  isDirect: true,
  depth: 1
}

const child: DependencyNode = {
  name: 'child',
  group: null,
  version: '2.0.0',
  packageManager: 'npm',
  purl: 'pkg:npm/child@2.0.0',
  scope: 'runtime',
  isDirect: true,
  depth: 1
}

interface TreeStubItem {
  key: string
  label: string
  children?: TreeStubItem[]
}

const UTreeStub = defineComponent({
  props: {
    items: { type: Array as PropType<TreeStubItem[]>, default: () => [] },
    expanded: { type: Array as PropType<string[]>, default: () => [] },
    getKey: { type: Function as PropType<(item: TreeStubItem) => string>, required: true }
  },
  emits: ['update:expanded'],
  setup(props, { slots, emit }) {
    const renderItems = (items: TreeStubItem[], level: number) =>
      items.map((item, index) => {
        const key = props.getKey(item)
        const expanded = props.expanded.includes(key)
        const handleToggle = () => {
          const next = expanded
            ? props.expanded.filter(value => value !== key)
            : [...props.expanded, key]
          emit('update:expanded', next)
        }

        return h('li', { key }, [
          slots['item-wrapper']?.({
            item,
            index,
            level,
            expanded,
            selected: false,
            indeterminate: undefined,
            handleSelect: () => {},
            handleToggle,
            ui: {}
          }),
          expanded && item.children?.length
            ? h('ul', renderItems(item.children, level + 1))
            : null
        ])
      })

    return () => h('ul', renderItems(props.items, 1))
  }
})

const global = {
  stubs: {
    UAlert: {
      props: ['title', 'description'],
      template: '<div role="alert"><strong>{{ title }}</strong><span>{{ description }}</span><slot /></div>'
    },
    UBadge: { template: '<span><slot /></span>' },
    UButton: {
      props: ['label', 'disabled'],
      emits: ['click'],
      template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>'
    },
    UCheckbox: {
      props: ['modelValue', 'label'],
      emits: ['update:modelValue'],
      template: '<input type="checkbox" :value="label" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />'
    },
    UIcon: { template: '<span />' },
    USkeleton: { template: '<div data-test="skeleton" />' },
    UTree: UTreeStub
  }
}

function treeResponse(overrides: Partial<DependencyTreeResponse> = {}): { success: true; data: DependencyTreeResponse } {
  return {
    success: true,
    data: {
      componentKey: 'root-key',
      dependencies: [],
      totalCount: 0,
      hasCircularDependencies: false,
      truncated: false,
      maxDepth: 1,
      ...overrides
    }
  }
}

async function mountTree(fetchMock: ReturnType<typeof vi.fn>, props = {}) {
  vi.stubGlobal('$fetch', fetchMock)
  const wrapper = mount(ComponentDependencyTree, {
    props: {
      componentKey: 'root-key',
      ...props
    },
    global
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
})

describe('[pin] ComponentDependencyTree', () => {
  it('fetches a shallow root dependency tree on mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(treeResponse({ dependencies: [rootA], totalCount: 1 }))

    const wrapper = await mountTree(fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/api/components/root-key/dependencies?')
    expect(fetchMock.mock.calls[0][0]).toContain('maxDepth=1')
    expect(fetchMock.mock.calls[0][0]).toContain('limit=500')
    expect(wrapper.text()).toContain('alpha')
  })

  it('lazy-loads children on first expand and reuses cached children', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA], totalCount: 1 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [child], totalCount: 1 }))

    const wrapper = await mountTree(fetchMock)
    await wrapper.get('button[data-node-key="pkg:npm/alpha@1.0.0"]').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('child')

    await wrapper.get('button[data-node-key="pkg:npm/alpha@1.0.0"]').trigger('click')
    await wrapper.get('button[data-node-key="pkg:npm/alpha@1.0.0"]').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps previously expanded branches open when another node expands', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA, rootB], totalCount: 2 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [child], totalCount: 1 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [], totalCount: 0 }))

    const wrapper = await mountTree(fetchMock)
    await wrapper.get('button[data-node-key="pkg:npm/alpha@1.0.0"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('child')

    await wrapper.get('button[data-node-key="pkg:npm/beta@1.0.0"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('child')
  })

  it('updates request context when filters change', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA], totalCount: 1 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA], totalCount: 1 }))

    const wrapper = await mountTree(fetchMock, { systemName: 'catalog' })
    await wrapper.get('input[value="runtime"]').setValue(true)
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('system=catalog')
    expect(fetchMock.mock.calls[1][0]).toContain('scope=runtime')
  })

  it('clears selected scopes before loading global dependencies', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA], totalCount: 1 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootA], totalCount: 1 }))
      .mockResolvedValueOnce(treeResponse({ dependencies: [rootB], totalCount: 1 }))

    const wrapper = await mountTree(fetchMock, { systemName: 'catalog' })
    await wrapper.get('input[value="runtime"]').setValue(true)
    await flushPromises()
    await wrapper.setProps({ systemName: undefined })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).not.toContain('system=')
    expect(fetchMock.mock.calls[2][0]).not.toContain('scope=')
    expect(wrapper.text()).toContain('beta')
    expect(wrapper.text()).not.toContain('No dependencies match the selected filters.')
  })

  it('renders empty and circular states', async () => {
    const circularNode: DependencyNode = {
      ...rootA,
      isCircular: true
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(treeResponse({
        dependencies: [circularNode],
        totalCount: 1,
        hasCircularDependencies: true
      }))

    const wrapper = await mountTree(fetchMock)

    expect(wrapper.text()).toContain('Circular dependencies detected')
    expect(wrapper.text()).toContain('circular')
  })

  it('renders an empty state when no dependencies are returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue(treeResponse())

    const wrapper = await mountTree(fetchMock)

    expect(wrapper.text()).toContain('This component has no dependencies.')
  })
})
