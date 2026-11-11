import type { NOTIFICATION_TYPE } from './const'

type ObjectValues<Values> = Values[keyof Values]

export type NotificationType = ObjectValues<typeof NOTIFICATION_TYPE>
