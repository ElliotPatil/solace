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

type VercelRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status(code: number): VercelResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const queryValue = request.query.q
  const typeValue = request.query.type
  const query = (Array.isArray(queryValue) ? queryValue[0] : queryValue || '').trim().slice(0, 80)
  const kind: SearchKind = (Array.isArray(typeValue) ? typeValue[0] : typeValue) === 'tv_show' ? 'tv_show' : 'movie'
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (query.length < 2) {
    response.status(200).json({ results: [] })
    return
  }
  if (!token) {
    response.status(503).json({ error: 'TMDB catalogue is not configured' })
    return
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
      response.status(upstream.status === 401 ? 503 : 502).json({ error: 'Catalogue search failed' })
      return
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

    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    response.status(200).json({ results })
  } catch {
    response.status(502).json({ error: 'Catalogue search is temporarily unavailable' })
  }
}
