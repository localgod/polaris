// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DependencyFilters from '../../../app/components/DependencyFilters.vue'

const global = {
  stubs: {
    UBadge: { template: '<span><slot /></span>' },
    UButton: {
      props: ['label', 'disabled'],
      emits: ['click'],
      template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>'
    },
    UCheckbox: {
      props: ['modelValue', 'label'],
      emits: ['update:modelValue'],
      template: '<input type="checkbox" :value="label" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />'
    }
  }
}

describe('[contract] DependencyFilters', () => {
  it('emits selected scopes when checkboxes change', async () => {
    const wrapper = mount(DependencyFilters, {
      props: { modelValue: [] },
      global
    })

    const runtime = wrapper.get('input[value="runtime"]')
    await runtime.setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['runtime']])
  })

  it('emits a cleared filter list', async () => {
    const wrapper = mount(DependencyFilters, {
      props: { modelValue: ['runtime', 'dev'] },
      global
    })

    expect(wrapper.text()).toContain('2 active')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]])
  })
})
