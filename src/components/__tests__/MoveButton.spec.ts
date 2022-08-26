import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import MoveButton from '../MoveButton.vue'

describe('MoveButton', () => {
  it('renders properly', () => {
    const wrapper = mount(
      MoveButton,
      {
        props:
          {
            decisionLabel: { text: "Testing Button", icon: null },
            value: 1
          }
      }
    )
    expect(wrapper.text()).toContain('Testing Button')
  })
})
