export * from './locale'

export const APP_NAME = APP_DATA.PKG.extra.productName
export const APP_ID = APP_DATA.PKG.name
export const APP_VERSION = APP_DATA.PKG.version
export const DATA = APP_DATA

export const APP_USER_AGENT = `${APP_NAME}/${APP_VERSION} (${APP_DATA.PKG.repository.url})`
