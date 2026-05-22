import countdownSound from '~/assets/sounds/countdown.mp3'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const COUNTDOWN_BEEP_DELAY = 1100
const COUNTDOWN_BEEP_COUNT = 9

export function useCountdown() {
    let audioCountdownElement: HTMLAudioElement | undefined = undefined
    let countdownTimeout: number | undefined = undefined
    const countdownTimerCounter = ref(0)

    function stopCountdown() {
        clearTimeout(countdownTimeout)
        countdownTimerCounter.value = 0
        if (audioCountdownElement) {
            audioCountdownElement.pause()
        }
    }
    function countdownTimeoutHandler() {
        countdownTimerCounter.value -= 1
        if (countdownTimerCounter.value > 0) {
            countdownTimeout = setTimeout(countdownTimeoutHandler, COUNTDOWN_BEEP_DELAY)
        }
    }

    function startCountdown() {
        if (audioCountdownElement && countdownTimerCounter.value === 0) {
            countdownTimerCounter.value = COUNTDOWN_BEEP_COUNT
            countdownTimeoutHandler()
            audioCountdownElement.currentTime = 0
            audioCountdownElement.play()
        }
    }

    onMounted(() => {
        audioCountdownElement = new Audio(countdownSound)
    })
    onBeforeUnmount(() => {
        stopCountdown()
    })

    return {
        countdownTimerCounter,
        startCountdown,
        stopCountdown,
    }
}