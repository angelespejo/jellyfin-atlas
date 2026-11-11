export const NOTIFICATION_TYPE = {
  error: 'error',
  warn: 'warn',
  success: 'success',
  info: 'info',
} as const

export const NOTIFICATION_ICON = {
  [NOTIFICATION_TYPE.error]: 'i-fa6-solid:circle-exclamation',
  [NOTIFICATION_TYPE.warn]: 'i-fa6-solid:triangle-exclamation',
  [NOTIFICATION_TYPE.success]: 'i-fa6-solid:circle-check',
  [NOTIFICATION_TYPE.info]: 'i-fa6-solid:circle-info',
}
