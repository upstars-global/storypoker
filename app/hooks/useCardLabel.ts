import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const CARD_KEY: Record<string, string> = {
  yes: 'yes',
  no: 'no',
  'За': 'yes',
  'Проти': 'no',
}

export function useCardLabel() {
  const { t } = useTranslation()
  return useCallback((card: string): string => {
    const key = CARD_KEY[card]
    return key ? t(`deck.cardLabels.${key}`) : card
  }, [t])
}
