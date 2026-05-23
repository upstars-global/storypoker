import countdownSound from '~/assets/sounds/countdown.mp3'
import countdownRevealSound from '~/assets/sounds/countdown-reveal.mp3'
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useCountdown() {
    let audioCountdownElement: HTMLAudioElement | undefined = undefined
    let audioCountdownRevealElement: HTMLAudioElement | undefined = undefined
    let countdownTimeout: number | undefined = undefined
    let countdownRevealFlag = false
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
            countdownTimeout = setTimeout(countdownTimeoutHandler, 1000)
        }
    }

    function startCountdown() {
        if (audioCountdownElement && countdownTimerCounter.value === 0) {
            countdownRevealFlag = true
            countdownTimerCounter.value = Math.ceil(audioCountdownElement.duration)
            countdownTimeoutHandler()
            audioCountdownElement.currentTime = 0
            audioCountdownElement.play()
        }
    }

    function countdownReveal() {
        stopCountdown()
        if (countdownRevealFlag) {
            if (audioCountdownRevealElement) {
                audioCountdownRevealElement.currentTime = 0
                audioCountdownRevealElement.play()
            }
            countdownRevealFlag = false
        }
    }

    onMounted(() => {
        audioCountdownElement = new Audio(countdownSound)
        audioCountdownRevealElement = new Audio(countdownRevealSound)
    })
    onBeforeUnmount(() => {
        stopCountdown()
    })

    return {
        countdownTimerCounter,
        startCountdown,
        stopCountdown,
        countdownReveal,
    }
}