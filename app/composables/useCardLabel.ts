import { useI18n } from 'vue-i18n'

const CARD_KEY: Record<string, string> = {
  yes: 'yes',
  no: 'no',
  'За': 'yes',
  'Проти': 'no',
}

export function useCardLabel() {
  const { t } = useI18n()
  return (card: string): string => {
    const key = CARD_KEY[card]
    return key ? t(`deck.cardLabels.${key}`) : card
  }
}
