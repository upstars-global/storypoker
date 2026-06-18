export type DeckPresetId = 'scrum' | 'fibonacci' | 'tshirt' | 'hours' | 'boolean' | 'voting' | 'vote_question'

export interface DeckPreset {
  id: DeckPresetId
  name: string
  cards: string[]
  defaultActive: string[]
}

export const DECK_PRESETS: DeckPreset[] = [
  {
    id: 'scrum',
    name: 'Scrum Scale',
    cards: ['0', '1/2', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕', '🚬', '🍺'],
    defaultActive: ['1/2', '1', '2', '3', '5', '8', '13', '20', '?', '☕'],
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Sequence',
    cards: ['0', '1/2 *', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '144', '?', '☕'],
    defaultActive: ['1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  },
  {
    id: 'tshirt',
    name: 'T-Shirt Sizes',
    cards: ['0', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
    defaultActive: ['S', 'M', 'L', 'XL', '?', '☕'],
  },
  {
    id: 'hours',
    name: 'Hours',
    cards: ['0', '1/2h', '1h', '2h', '3h', '5h', '8h', '13h', '20h', '40h', '100h', '?', '☕'],
    defaultActive: ['1/2h', '1h', '2h', '3h', '5h', '8h', '13h', '20h', '?', '☕'],
  },
  {
    id: 'boolean',
    name: 'Boolean',
    cards: ['True', 'False', '?', '☕'],
    defaultActive: ['True', 'False', '?', '☕'],
  },
  {
    id: 'voting',
    name: 'Vote - Y/N',
    cards: ['yes', 'no', '☕', '🍺', '🚬'],
    defaultActive: ['yes', 'no', '☕'],
  },
  {
    id: 'vote_question',
    name: 'Vote - Question?',
    cards: [],
    defaultActive: ['Option A', 'Option B', 'Option C'],
  },
]

export const VOTING_BASE_CARDS = ['yes', 'no']
export const VOTING_THIRD_CARDS = ['☕', '🍺', '🚬']

export const DEFAULT_PRESET_ID: DeckPresetId = 'scrum'

export function getDeck(id: DeckPresetId): DeckPreset {
  return DECK_PRESETS.find(p => p.id === id) ?? DECK_PRESETS[0]!
}
