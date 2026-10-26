import pleaseVoteSound from '~/assets/sounds/please-vote.mp3'
import countdownDrySound from '~/assets/sounds/countdown-dry.mp3'
import countdownWetSound from '~/assets/sounds/countdown-wet.mp3'
import ambienceSound from '~/assets/sounds/ambience.mp3'
import decisionSound from '~/assets/sounds/the-decision-has-been-made.mp3'
import { useEffect, useState } from 'react'
import { createStore, useStore } from 'zustand'
import { soundVolumeStore } from '~/hooks/useSoundVolume'

const COUNTDOWN_FALLBACK_SECONDS = 10

export type CountdownMode = 'silent' | 'dry' | 'wet'

type CountdownState = {
  countdownTimerCounter: number
  countdownTimerTotal: number
  countdownActive: boolean
  countdownRunning: boolean
}

function createCountdown() {
  const store = createStore<CountdownState>()(() => ({
    countdownTimerCounter: 0,
    countdownTimerTotal: 0,
    countdownActive: false,
    countdownRunning: false,
  }))

  let pleaseVoteAudio: HTMLAudioElement | undefined = undefined
  let countdownDryAudio: HTMLAudioElement | undefined = undefined
  let countdownWetAudio: HTMLAudioElement | undefined = undefined
  let ambienceAudio: HTMLAudioElement | undefined = undefined
  let decisionAudio: HTMLAudioElement | undefined = undefined
  let countdownTimeout: ReturnType<typeof setTimeout> | undefined = undefined
  let currentMode: CountdownMode = 'dry'
  let onCountdownComplete: (() => void) | undefined = undefined
  let hasConsensus: (() => boolean) | undefined = undefined

  function allAudio() {
    return [pleaseVoteAudio, countdownDryAudio, countdownWetAudio, ambienceAudio, decisionAudio]
  }

  function applyVolume(volume: number) {
    for (const audio of allAudio()) {
      if (audio) audio.volume = volume
    }
  }

  function resetAudio() {
    for (const audio of allAudio()) {
      if (audio) {
        audio.pause()
        audio.onended = null
      }
    }
  }

  function stopCountdown() {
    clearTimeout(countdownTimeout)
    countdownTimeout = undefined
    store.setState({ countdownTimerCounter: 0, countdownActive: false, countdownRunning: false })
    onCountdownComplete = undefined
    hasConsensus = undefined
    resetAudio()
  }

  function countdownTimeoutHandler() {
    const counter = store.getState().countdownTimerCounter - 1
    store.setState({ countdownTimerCounter: counter })
    if (counter > 0) {
      countdownTimeout = setTimeout(countdownTimeoutHandler, 1000)
    } else {
      finishCountdown()
    }
  }

  function beginTimer(totalSeconds: number) {
    store.setState({ countdownTimerTotal: totalSeconds, countdownTimerCounter: totalSeconds, countdownActive: true })
    countdownTimeout = setTimeout(countdownTimeoutHandler, 1000)
  }

  function startVisualCountdown(audio: HTMLAudioElement) {
    audio.currentTime = 0
    void audio.play()
    beginTimer(Math.ceil(audio.duration) || COUNTDOWN_FALLBACK_SECONDS)
  }

  function finishCountdown() {
    clearTimeout(countdownTimeout)
    countdownTimeout = undefined
    store.setState({ countdownTimerCounter: 0, countdownActive: false, countdownRunning: false })
    if (currentMode === 'wet' && !hasConsensus?.() && ambienceAudio) {
      ambienceAudio.currentTime = 0
      ambienceAudio.play().catch(() => {})
    }
    onCountdownComplete?.()
    onCountdownComplete = undefined
    hasConsensus = undefined
  }

  function playDecision() {
    if (!decisionAudio) return
    decisionAudio.currentTime = 0
    decisionAudio.play().catch(() => {})
  }

  function startCountdown(mode: CountdownMode, onComplete?: () => void, withConsensus?: () => boolean) {
    if (store.getState().countdownRunning) return
    const dry = countdownDryAudio
    const votePrompt = pleaseVoteAudio
    const wet = countdownWetAudio
    if (mode === 'dry' && !dry) return
    if (mode === 'wet' && (!votePrompt || !wet)) return
    store.setState({ countdownRunning: true })
    currentMode = mode
    onCountdownComplete = onComplete
    hasConsensus = withConsensus
    if (mode === 'silent') {
      beginTimer(COUNTDOWN_FALLBACK_SECONDS)
    } else if (mode === 'dry' && dry) {
      startVisualCountdown(dry)
    } else if (votePrompt && wet) {
      votePrompt.currentTime = 0
      votePrompt.onended = () => {
        votePrompt.onended = null
        startVisualCountdown(wet)
      }
      void votePrompt.play()
    }
  }

  function mount() {
    pleaseVoteAudio ??= new Audio(pleaseVoteSound)
    countdownDryAudio ??= new Audio(countdownDrySound)
    countdownWetAudio ??= new Audio(countdownWetSound)
    ambienceAudio ??= new Audio(ambienceSound)
    decisionAudio ??= new Audio(decisionSound)
    applyVolume(soundVolumeStore.getState().volume)
    const unsubscribe = soundVolumeStore.subscribe((state, previous) => {
      if (state.volume !== previous.volume) applyVolume(state.volume)
    })
    return () => {
      unsubscribe()
      stopCountdown()
    }
  }

  return { store, mount, startCountdown, stopCountdown, playDecision }
}

export function useCountdown() {
  const [countdown] = useState(createCountdown)
  const state = useStore(countdown.store)

  useEffect(() => countdown.mount(), [countdown])

  return {
    ...state,
    startCountdown: countdown.startCountdown,
    stopCountdown: countdown.stopCountdown,
    playDecision: countdown.playDecision,
  }
}
