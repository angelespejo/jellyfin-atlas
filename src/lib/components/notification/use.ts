import {
	writable,
	type Writable,
} from 'svelte/store'

import type { NotificationType } from './types'

const NOTIFICATION_TIMEOUT = 4000

type Notification = {
	id        : string
	type      : NotificationType
	message   : string
	timeout?  : number
	paused?   : boolean
	remaining : number
	start     : number
}

const createNotificationStore = () => {

	const id = () => '_' + Math.random().toString( 36 ).substr( 2, 9 )

	const timeoutIds: Map<string, NodeJS.Timeout>  = new Map()
	const _notifications: Writable<Notification[]> = writable( [], () => {

		return () => {

			// Clear all timers
			timeoutIds.forEach( timeoutId => clearTimeout( timeoutId ) )
			_notifications.set( [] )

		}

	} )

	const send = ( message: string, type: NotificationType ) => {

		const _id                        = id()
		const start                      = Date.now()
		const notification: Notification = {
			id        : _id,
			type,
			message,
			remaining : NOTIFICATION_TIMEOUT,
			start,
		}
		_notifications.update( state => [ ...state, notification ] )

		const timeoutId = setTimeout( () => remove( _id ), NOTIFICATION_TIMEOUT )
		timeoutIds.set( _id, timeoutId )

	}

	const remove = ( notificationId: string ) => {

		_notifications.update( state => state.filter( ( { id } ) => id !== notificationId ) )
		if ( timeoutIds.has( notificationId ) ) {

			clearTimeout( timeoutIds.get( notificationId ) )
			timeoutIds.delete( notificationId )

		}

	}

	const pause = ( notificationId: string ) => {

		const notification = getNotification( notificationId )
		if ( !notification ) return

		const elapsed           = Date.now() - notification.start
		notification.remaining -= elapsed
		notification.paused     = true
		clearTimeout( timeoutIds.get( notificationId ) )
		timeoutIds.delete( notificationId )

	}

	const resume = ( notificationId: string ) => {

		const notification = getNotification( notificationId )
		if ( !notification || !notification.paused ) return

		notification.paused = false
		notification.start  = Date.now()

		const timeoutId = setTimeout( () => remove( notificationId ), notification.remaining )
		timeoutIds.set( notificationId, timeoutId )

	}

	const getNotification = ( notificationId: string ): Notification | undefined => {

		let result: Notification | undefined
		_notifications.update( state => {

			result = state.find( ( { id } ) => id === notificationId )
			return state

		} )
		return result

	}
	const sendError     = ( title:string, e: unknown ) => {

		send( `${title}: ${e instanceof Error ? e.message : 'Unexpected error'}`, 'error' )

	}
	const { subscribe } = _notifications

	return {
		subscribe,
		send,
		sendError,
		remove,
		pause,
		resume,
	}

}

export const notifications = createNotificationStore()
