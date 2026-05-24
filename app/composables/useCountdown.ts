import pleaseVoteSound from '~/assets/sounds/please-vote.mp3'
import countdownDrySound from '~/assets/sounds/countdown-dry.mp3'
import countdownWetSound from '~/assets/sounds/countdown-wet.mp3'
import ambienceSound from '~/assets/sounds/ambience.mp3'
import decisionSound from '~/assets/sounds/the-decision-has-been-made.mp3'
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
    let shouldPlayDecision: (() => boolean) | undefined = undefined
    const countdownTimerCounter = ref(0)
    const countdownTimerTotal = ref(0)
    const countdownActive = ref(false)
    const countdownRunning = ref(false)

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
        shouldPlayDecision = undefined
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
        if (currentMode === 'wet') {
            const endAudio = shouldPlayDecision?.() ? decisionAudio : ambienceAudio
            if (endAudio) {
                endAudio.currentTime = 0
                endAudio.play()
            }
        }
        onCountdownComplete?.()
        onCountdownComplete = undefined
        shouldPlayDecision = undefined
    }

    function startCountdown(mode: CountdownMode, onComplete?: () => void, withDecision?: () => boolean) {
        if (countdownRunning.value) return
        if (mode === 'dry' && !countdownDryAudio) return
        if (mode === 'wet' && (!pleaseVoteAudio || !countdownWetAudio)) return
        countdownRunning.value = true
        currentMode = mode
        onCountdownComplete = onComplete
        shouldPlayDecision = withDecision
        if (mode === 'silent') {
            beginTimer(COUNTDOWN_FALLBACK_SECONDS)
        } else if (mode === 'dry') {
            startVisualCountdown(countdownDryAudio!)
        } else {
            pleaseVoteAudio!.currentTime = 0
            pleaseVoteAudio!.onended = () => {
                if (pleaseVoteAudio) pleaseVoteAudio.onended = null
                startVisualCountdown(countdownWetAudio!)
            }
            pleaseVoteAudio!.play()
        }
    }

    onMounted(() => {
        pleaseVoteAudio = new Audio(pleaseVoteSound)
        countdownDryAudio = new Audio(countdownDrySound)
        countdownWetAudio = new Audio(countdownWetSound)
        ambienceAudio = new Audio(ambienceSound)
        decisionAudio = new Audio(decisionSound)
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
    }
}
