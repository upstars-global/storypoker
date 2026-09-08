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
  messages: { en: { players: { menuFor: 'Player menu: {name}' } } },
})

function mountRow() {
  return mount(PlayerRow, {
    props: {
      player: {
        id: 'p1',
        name: 'Alice',
        is_moderator: false,
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

  it('moves focus between items with ArrowDown', async () => {
    const wrapper = mountRow()
    const menu = await openMenu(wrapper)
    const items = wrapper.findAll('[role="menuitem"]')
    expect(document.activeElement).toBe(items[0]!.element)
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
  })

  it('closes the menu with Escape', async () => {
    const wrapper = mountRow()
    await openMenu(wrapper)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})

describe('PlayerRow menu button name', () => {
  it('names the menu button after the player', () => {
    const wrapper = mountRow()
    expect(wrapper.get('button[aria-expanded]').attributes('aria-label')).toBe('Player menu: Alice')
  })
})
