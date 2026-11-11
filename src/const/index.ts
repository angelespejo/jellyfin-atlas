import PKG from '../../package.json' with { type: 'json' }

export const APP_NAME = PKG.extra.productName
export const APP_ID = PKG.name
export const APP_VERSION = PKG.version
export const DATA = PKG

export const APP_USER_AGENT = `${APP_NAME}/${APP_VERSION} (${PKG.repository.url})`
export const LOCALE_STRATEGY_ID = 'custom-default-locale'
