import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import PlayerRow from '~/components/PlayerRow.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountRow() {
  return mount(PlayerRow, {
    props: {
      player: {
        id: 'p1',
        name: 'Alice',
        is_moderator: false,
        is_spectator: false,
        vote: null,
        is_online: true,
        user_id: null,
        shields: [],
        votePending: false,
      },
      phase: 'voting' as const,
      currentPlayerId: 'p1',
      currentUserIsModerator: false,
      currentUserIsAuthorizedModerator: false,
    },
    global: {
      plugins: [createPinia(), i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true },
    },
    attachTo: document.body,
  })
}

describe('PlayerRow menu keyboard support', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  async function openMenu(wrapper: ReturnType<typeof mountRow>) {
    await wrapper.get('button[aria-expanded]').trigger('click')
    return wrapper.get('[role="menu"]')
  }

  it('activates a menu item with Enter', async () => {
    const wrapper = mountRow()
    await openMenu(wrapper)
    const editItem = wrapper.findAll('[role="menuitem"]')[1]!
    await editItem.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('edit')).toEqual([['p1']])
  })

  it('activates a menu item with Space', async () => {
    const wrapper = mountRow()
    await openMenu(wrapper)
    const toggleItem = wrapper.findAll('[role="menuitem"]')[0]!
    await toggleItem.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('toggleModerator')).toEqual([['p1', true]])
  })

  it('closes the menu with Escape', async () => {
    const wrapper = mountRow()
    await openMenu(wrapper)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
