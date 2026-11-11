type URLParam = {
	key    : string
	value? : string
}
type URLHash = string

type onURLOptions<Ref extends ( HTMLElement | SVGElement )> = {
	params?   : URLParam[]
	hash?     : URLHash[]
	callback? : ( data: {
		ref     : Ref
		url     : URL
		params? : URLParam[]
		hash?   : URLHash
	} ) => void | Promise<void>
}
type onURLHashOptions<Ref extends ( HTMLElement | SVGElement )> = {
	hash?     : URLHash[]
	callback? : ( data: {
		ref   : Ref
		url   : URL
		hash? : URLHash
	} ) => void | Promise<void>
}
const getHash = ( url: URL, options?: URLHash[] ): URLHash | undefined => {

	return options?.includes( url.hash ) ? url.hash : undefined

}

const getParams = ( url: URL, options?: URLParam[] ): URLParam[] | undefined => {

	if ( !options ) return
	const res: URLParam[] = []

	url.searchParams.forEach( ( value, key ) => {

		const exists = options?.some( param => param.key === key )
		if ( exists ) res.push( {
			key,
			value,
		} )

	} )
	return res.length > 0 ? res : undefined

}

export const onURLHash = <Ref extends ( HTMLElement | SVGElement )>(
	node: Ref,
	options: onURLHashOptions<Ref>,
) => {

	const handleURLChange = async () => {

		if ( !options.callback ) return
		const url  = new URL( window.location.href )
		const hash = getHash( url, options.hash )

		await options.callback( {
			ref : node,
			url,
			hash,
		} )

	}

	handleURLChange()

	const handlePopState = () => handleURLChange()

	if ( options.hash ) window.addEventListener( 'hashchange', handlePopState )

	return { destroy() {

		if ( options.hash ) window.removeEventListener( 'hashchange', handlePopState )

	} }

}
export const onURL = <Ref extends ( HTMLElement | SVGElement )>(
	node: Ref,
	options: onURLOptions<Ref>,
) => {

	const handleURLChange = async () => {

		if ( !options.callback ) return
		const url    = new URL( window.location.href )
		const params = getParams( url, options.params )
		const hash   = getHash( url, options.hash )

		await options.callback( {
			ref : node,
			url,
			params,
			hash,
		} )

	}

	handleURLChange()

	const handlePopState = () => handleURLChange()

	if ( options.params ) window.addEventListener( 'popstate', handlePopState )
	if ( options.hash ) window.addEventListener( 'hashchange', handlePopState )

	return { destroy() {

		if ( options.params ) window.removeEventListener( 'popstate', handlePopState )
		if ( options.hash ) window.removeEventListener( 'hashchange', handlePopState )

	} }

}
