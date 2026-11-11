import { tick } from 'svelte'

export const portal = ( el: HTMLElement, target: string | HTMLElement = 'body' ) => {

	let targetEl: HTMLElement | null

	const update = async ( newTarget: string | HTMLElement ) => {

		target = newTarget
		if ( typeof target === 'string' ) {

			targetEl = document.querySelector( target )
			if ( targetEl === null ) {

				await tick()
				targetEl = document.querySelector( target )

			}
			if ( targetEl === null ) {

				throw new Error(
					`No element found matching css selector: "${target}"`,
				)

			}

		}
		else if ( target instanceof HTMLElement ) {

			targetEl = target

		}
		else {

			throw new TypeError(
				`Unknown portal target type: ${
					target === null ? 'null' : typeof target
				}. Allowed types: string (CSS selector) or HTMLElement.`,
			)

		}
		targetEl.appendChild( el )
		el.hidden = false

	}

	update( target )
	return {
		update,
		destroy : () => {

			if ( el.parentNode ) {

				el.parentNode.removeChild( el )

			}

		},
	}

}
