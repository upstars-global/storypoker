import pleaseVoteSound from '~/assets/sounds/please-vote.mp3'
import countdownDrySound from '~/assets/sounds/countdown-dry.mp3'
import countdownWetSound from '~/assets/sounds/countdown-wet.mp3'
import ambienceSound from '~/assets/sounds/ambience.mp3'
import decisionSound from '~/assets/sounds/the-decision-has-been-made.mp3'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSoundVolume } from '~/composables/useSoundVolume'

const COUNTDOWN_FALLBACK_SECONDS = 10

export type CountdownMode = 'silent' | 'dry' | 'wet'

export function useCountdown() {
    let pleaseVoteAudio: HTMLAudioElement | undefined = undefined
    let countdownDryAudio: HTMLAudioElement | undefined = undefined
    let countdownWetAudio: HTMLAudioElement | undefined = undefined
    let ambienceAudio: HTMLAudioElement | undefined = undefined
    let decisionAudio: HTMLAudioElement | undefined = undefined
    let countdownTimeout: number | undefined = undefined
    let currentMode: CountdownMode = 'dry'
    let onCountdownComplete: (() => void) | undefined = undefined
    let hasConsensus: (() => boolean) | undefined = undefined
    const countdownTimerCounter = ref(0)
    const countdownTimerTotal = ref(0)
    const countdownActive = ref(false)
    const countdownRunning = ref(false)

    const { volume } = useSoundVolume()

    function applyVolume() {
        for (const audio of [pleaseVoteAudio, countdownDryAudio, countdownWetAudio, ambienceAudio, decisionAudio]) {
            if (audio) audio.volume = volume.value
        }
    }

    watch(volume, applyVolume)

    function resetAudio() {
        const all = [pleaseVoteAudio, countdownDryAudio, countdownWetAudio, ambienceAudio, decisionAudio]
        for (const audio of all) {
            if (audio) {
                audio.pause()
                audio.onended = null
            }
        }
    }

    function stopCountdown() {
        clearTimeout(countdownTimeout)
        countdownTimeout = undefined
        countdownTimerCounter.value = 0
        countdownActive.value = false
        countdownRunning.value = false
        onCountdownComplete = undefined
        hasConsensus = undefined
        resetAudio()
    }

    function countdownTimeoutHandler() {
        countdownTimerCounter.value -= 1
        if (countdownTimerCounter.value > 0) {
            countdownTimeout = setTimeout(countdownTimeoutHandler, 1000)
        } else {
            finishCountdown()
        }
    }

    function beginTimer(totalSeconds: number) {
        countdownTimerTotal.value = totalSeconds
        countdownTimerCounter.value = totalSeconds
        countdownActive.value = true
        countdownTimeout = setTimeout(countdownTimeoutHandler, 1000)
    }

    function startVisualCountdown(audio: HTMLAudioElement) {
        audio.currentTime = 0
        audio.play()
        beginTimer(Math.ceil(audio.duration) || COUNTDOWN_FALLBACK_SECONDS)
    }

    function finishCountdown() {
        clearTimeout(countdownTimeout)
        countdownTimeout = undefined
        countdownTimerCounter.value = 0
        countdownActive.value = false
        countdownRunning.value = false
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
        if (countdownRunning.value) return
        const dry = countdownDryAudio
        const votePrompt = pleaseVoteAudio
        const wet = countdownWetAudio
        if (mode === 'dry' && !dry) return
        if (mode === 'wet' && (!votePrompt || !wet)) return
        countdownRunning.value = true
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
            votePrompt.play()
        }
    }

    onMounted(() => {
        pleaseVoteAudio = new Audio(pleaseVoteSound)
        countdownDryAudio = new Audio(countdownDrySound)
        countdownWetAudio = new Audio(countdownWetSound)
        ambienceAudio = new Audio(ambienceSound)
        decisionAudio = new Audio(decisionSound)
        applyVolume()
    })
    onBeforeUnmount(() => {
        stopCountdown()
    })

    return {
        countdownTimerCounter,
        countdownTimerTotal,
        countdownActive,
        countdownRunning,
        startCountdown,
        stopCountdown,
        playDecision,
    }
}
