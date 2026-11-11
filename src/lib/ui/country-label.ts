import * as m from '#i18n/messages.js'

/** Internal key used by the store for titles without a production country. */
export const UNKNOWN_COUNTRY = 'Unknown'

export function isUnknownCountry(country: string): boolean {
  return country === UNKNOWN_COUNTRY
}

/** User-facing country name: keeps real names, localizes the unknown bucket. */
export function countryLabel(country: string): string {
  return isUnknownCountry(country) ? m['country.unknown']() : country
}
