export const isMaskVariant = process.env.ICON_RENDERER === 'mask'
export const variant = isMaskVariant ? 'b' : 'a'
export const iconSelector = isMaskVariant ? 'span.sp-icon' : 'svg.iconify'
