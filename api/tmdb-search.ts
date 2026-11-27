type SearchKind = 'movie' | 'tv_show'

type TmdbResult = {
  id: number
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') || '').trim().slice(0, 80)
  const kind = url.searchParams.get('type') === 'tv_show' ? 'tv_show' : 'movie'
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN

  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  if (query.length < 2) return Response.json({ results: [] })
  if (!token) {
    return Response.json({ error: 'TMDB catalogue is not configured' }, { status: 503 })
  }

  try {
    const endpoint = kind === 'movie' ? 'movie' : 'tv'
    const searchUrl = new URL(`https://api.themoviedb.org/3/search/${endpoint}`)
    searchUrl.searchParams.set('query', query)
    searchUrl.searchParams.set('include_adult', 'false')
    searchUrl.searchParams.set('language', 'en-US')
    searchUrl.searchParams.set('page', '1')

    const upstream = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    if (!upstream.ok) {
      return Response.json({ error: 'Catalogue search failed' }, { status: upstream.status === 401 ? 503 : 502 })
    }

    const payload = await upstream.json() as { results?: TmdbResult[] }
    const results = (payload.results || []).slice(0, 8).map((item) => ({
      id: item.id,
      title: kind === 'movie' ? item.title || '' : item.name || '',
      overview: item.overview || '',
      posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : null,
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
      releaseDate: kind === 'movie' ? item.release_date || '' : item.first_air_date || '',
      mediaType: kind
    }))
    return Response.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch {
    return Response.json({ error: 'Catalogue search is temporarily unavailable' }, { status: 502 })
  }
}
