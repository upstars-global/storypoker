import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useCardLabel } from '~/hooks/useCardLabel'
import { useRipple } from '~/hooks/useRipple'
import { DECK_PRESETS, getDeck, VOTING_BASE_CARDS, VOTING_THIRD_CARDS, type DeckPresetId } from '~/utils/cardDecks'

export type CardDeckPayload = { deckPreset: DeckPresetId; cards: string[] }

type ConfigureCardDeckModalProps = {
  deckPreset: DeckPresetId
  activeCards: string[]
  onSave: (payload: CardDeckPayload) => void
  onClose: () => void
}

const PRESET_ITEMS = DECK_PRESETS.map(p => ({ value: p.id, label: p.name }))

const PRESET_TRIGGER_CLASS = [
  'mui-input w-full gap-0 rounded-(--radius-input) border-input bg-transparent py-[17.5px] pr-0 pl-[18px]',
  'text-[1rem] leading-[normal] data-[size=default]:h-auto cursor-pointer',
  'focus-visible:ring-0 focus-visible:border-(--primary) dark:bg-transparent dark:hover:bg-transparent',
  '[&>svg]:text-(--text-primary) [&>svg]:stroke-[3]',
].join(' ')

export default function ConfigureCardDeckModal({ deckPreset, activeCards, onSave, onClose }: ConfigureCardDeckModalProps) {
  const { t } = useTranslation()
  const cardLabel = useCardLabel()
  const ripple = useRipple<HTMLButtonElement>()
  const [presetId, setPresetId] = useState<DeckPresetId>(deckPreset)
  const [selected, setSelected] = useState<string[]>(() => [...activeCards])
  const incoming = { deckPreset, cards: activeCards.join('\n') }
  const [synced, setSynced] = useState(incoming)

  if (synced.deckPreset !== incoming.deckPreset || synced.cards !== incoming.cards) {
    if (synced.deckPreset !== incoming.deckPreset) setPresetId(deckPreset)
    if (synced.cards !== incoming.cards) setSelected([...activeCards])
    setSynced(incoming)
  }

  const currentDeck = getDeck(presetId)
  const isVoting = presetId === 'voting'
  const isVoteQuestion = presetId === 'vote_question'
  const votingThird = selected.find(c => VOTING_THIRD_CARDS.includes(c)) ?? VOTING_THIRD_CARDS[0]!

  function toggle(card: string) {
    setSelected((current) => {
      if (current.includes(card)) return current.filter(c => c !== card)
      const order = currentDeck.cards
      return [...current, card].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    })
  }

  function applyPreset(id: DeckPresetId) {
    setPresetId(id)
    setSelected([...getDeck(id).defaultActive])
  }

  return (
    <AppModal
      labelledby="card-deck-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '560px', padding: '32px 40px 40px' }}
        onClose={onClose}
      >
        <h2
          id="card-deck-modal-title"
          className="text-center text-mui-h2 font-bold text-primary"
        >
          {t('deck.configure')}
        </h2>

        <div className="mt-7 flex justify-center">
          <Select
            items={PRESET_ITEMS}
            value={presetId}
            onValueChange={(value) => {
              if (value) applyPreset(value)
            }}
          >
            <SelectTrigger
              className={PRESET_TRIGGER_CLASS}
              style={{ minWidth: '240px' }}
              data-testid="deck-preset-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {PRESET_ITEMS.map(item => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isVoting
          ? (
              <div className="flex flex-col items-center gap-6 mt-8 mb-2">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-mui-caption font-semibold uppercase tracking-wide text-muted">
                    {t('deck.alwaysIncluded')}
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {VOTING_BASE_CARDS.map(card => (
                      <span
                        key={card}
                        className="mui-chip is-selected is-disabled"
                      >
                        <AppIcon
                          className="mui-chip-check"
                          name="ic:baseline-check"
                        />
                        {cardLabel(card)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-mui-caption font-semibold uppercase tracking-wide text-primary">
                    {t('poll.thirdCard')}
                  </span>
                  <div className="flex items-center gap-2">
                    {VOTING_THIRD_CARDS.map(card => (
                      <button
                        key={card}
                        type="button"
                        className={votingThird === card ? 'mui-chip is-selected' : 'mui-chip'}
                        aria-pressed={votingThird === card}
                        onClick={() => setSelected([...VOTING_BASE_CARDS, card])}
                      >
                        {votingThird === card && (
                          <AppIcon
                            className="mui-chip-check"
                            name="ic:baseline-check"
                          />
                        )}
                        {card}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          : isVoteQuestion
            ? (
                <div className="flex justify-center mt-8 mb-2">
                  <p className="text-mui-body text-muted text-center">
                    {t('deck.voteQuestionInfo')}
                  </p>
                </div>
              )
            : (
                <div
                  className="flex flex-wrap justify-center gap-2 mt-8 mb-2 mx-auto"
                  style={{ maxWidth: '420px' }}
                >
                  {currentDeck.cards.map(card => (
                    <label
                      key={card}
                      className={selected.includes(card) ? 'mui-chip is-selected' : 'mui-chip'}
                    >
                      <input
                        id={`deck-card-${card}`}
                        type="checkbox"
                        name={`deck-card-${card}`}
                        checked={selected.includes(card)}
                        className="sr-only"
                        onChange={() => toggle(card)}
                      />
                      {selected.includes(card) && (
                        <AppIcon
                          className="mui-chip-check"
                          name="ic:baseline-check"
                        />
                      )}
                      {card}
                    </label>
                  ))}
                </div>
              )}

        <div className="flex justify-center mt-8">
          <Button
            ref={ripple}
            onClick={() => onSave({ deckPreset: presetId, cards: selected })}
          >
            {t('deck.save')}
          </Button>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
