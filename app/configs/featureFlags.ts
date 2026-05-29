const featureFlagsLSKey = 'FEATURE_FLAGS'

export type FeatureFlagItem = {
    enabled: boolean
}

export type FeatureFlagKey = 'countdownEnabled' | 'iconsLucide' | 'iconsRounded' | 'example'
export type FeatureFlags = Record<FeatureFlagKey, FeatureFlagItem>

export const featureFlags: FeatureFlags = {
    countdownEnabled: {
        enabled: true,
    },
    iconsLucide: {
        enabled: false,
    },
    iconsRounded: {
        enabled: true,
    },
    example: {
        enabled: false,
    },
}

function getFeaturesFlagsFromLS() {
    if (typeof window !== 'undefined') {
        try {
            const data = window.localStorage.getItem(featureFlagsLSKey)
            if (data) {
                return JSON.parse(data) as Record<string, boolean>
            }
        } catch (e) {
            console.warn('error in getFeaturesFlagsFromLS', e)
        }
    }
    return {}
}

export function getFeatureFlags(): FeatureFlags {
    const savedFlags = getFeaturesFlagsFromLS()
    const featureFlagsCopy: FeatureFlags = JSON.parse(JSON.stringify(featureFlags))
    for (const flagKey in featureFlagsCopy) {
        let enabled = featureFlagsCopy[flagKey as FeatureFlagKey].enabled
        if (typeof savedFlags[flagKey] === 'boolean') {
            enabled = savedFlags[flagKey]
        }
        featureFlagsCopy[flagKey as FeatureFlagKey] = {
            ...featureFlagsCopy[flagKey as FeatureFlagKey],
            enabled,
        }
    }

    return featureFlagsCopy
}

export function getFeatureFlagValue(key: FeatureFlagKey) {
    const savedFlags = getFeaturesFlagsFromLS()
    if (typeof savedFlags[key] === 'boolean') {
        return savedFlags[key]
    }
    return featureFlags[key].enabled
}

export function setFeatureFlagValue(key: FeatureFlagKey, value: boolean) {
    if (typeof window !== 'undefined') {
        const savedFlags = getFeaturesFlagsFromLS()
        savedFlags[key] = value
        window.localStorage.setItem(featureFlagsLSKey, JSON.stringify(savedFlags))
    }
}

export function resetFeatureFlagValues() {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(featureFlagsLSKey)
    }
}
