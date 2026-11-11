
import type { Action } from 'svelte/action'

export type DragDropDetail = { files: FileList }

interface DragDropOptions {
	ondrop?     : ( files: FileList ) => void
	ondragover? : ( value: boolean ) => void
}

export const dragdrop: Action<HTMLElement, DragDropOptions> = ( node, opts ) => {

	const handleDragEnter = ( e: DragEvent ) => {

		e.preventDefault()
		opts.ondragover?.( true )

	}
	const handleDragLeave = ( e: DragEvent ) => {

		e.preventDefault()
		opts.ondragover?.( false )

	}
	const handleDragOver  = ( e: DragEvent ) => {

		e.preventDefault()
		opts.ondragover?.( true )

	}
	const handleDrop      = async ( e: DragEvent ) => {

		e.preventDefault()
		opts.ondragover?.( false )
		const files = e.dataTransfer?.files
		if ( files && opts.ondrop ) opts.ondrop( files )

	}

	node.addEventListener( 'dragenter', handleDragEnter )
	node.addEventListener( 'dragleave', handleDragLeave )
	node.addEventListener( 'dragover', handleDragOver )
	node.addEventListener( 'drop', handleDrop )

	return { destroy() {

		node.removeEventListener( 'dragenter', handleDragEnter )
		node.removeEventListener( 'dragleave', handleDragLeave )
		node.removeEventListener( 'dragover', handleDragOver )
		node.removeEventListener( 'drop', handleDrop )

	} }

}
