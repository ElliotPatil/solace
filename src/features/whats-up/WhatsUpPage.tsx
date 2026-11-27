import { useEffect, useMemo, useState } from 'react'
import { getEntertainmentItems, saveEntertainmentItem, deleteEntertainmentItem, getSongs, saveSong, deleteSong } from '../../db'
import type { EntertainmentItem, EntertainmentStatus, Song } from './types'
import { Plus, Trash2, Film, Music2, Search, LoaderCircle } from 'lucide-react'
import CustomSelect from '../../components/ui/CustomSelect'
import LocalMusicPlayer from './LocalMusicPlayer'

const now=()=>new Date().toISOString()
type WatchStatusFilter = 'all'|'watching'|'favourite'|'watchlist'
type WatchTypeFilter = 'all'|'movie'|'tv_show'
type CatalogueResult = { id:number; title:string; overview:string; posterUrl:string|null; backdropUrl:string|null; releaseDate:string; mediaType:'movie'|'tv_show' }
const statusOptions: Array<{value:EntertainmentStatus,label:string}> = [
  {value:'watchlist',label:'Watchlist'},{value:'watching',label:'Currently watching'},
  {value:'favourite',label:'Favourite'},{value:'completed',label:'Completed'},
  {value:'paused',label:'Paused'},{value:'dropped',label:'Not continuing'},
]
const statusLabel:Record<EntertainmentStatus,string>={watchlist:'Watchlist',watching:'Currently watching',favourite:'Favourite',completed:'Completed',paused:'Paused',dropped:'Not continuing'}

export default function WhatsUpPage() {
  const [items,setItems]=useState<EntertainmentItem[]>([])
  const [songs,setSongs]=useState<Song[]>([])
  const [tab,setTab]=useState<'watch'|'listen'>('watch')
  const [title,setTitle]=useState('')
  const [detail,setDetail]=useState('')
  const [status,setStatus]=useState<EntertainmentStatus>('watchlist')
  const [kind,setKind]=useState<'movie'|'tv_show'>('movie')
  const [statusFilter,setStatusFilter]=useState<WatchStatusFilter>('all')
  const [typeFilter,setTypeFilter]=useState<WatchTypeFilter>('all')
  const [error,setError]=useState('')
  const [suggestions,setSuggestions]=useState<CatalogueResult[]>([])
  const [selectedResult,setSelectedResult]=useState<CatalogueResult|null>(null)
  const [searching,setSearching]=useState(false)
  const [searchError,setSearchError]=useState('')
  const [showSuggestions,setShowSuggestions]=useState(false)
  async function refresh(){const [i,s]=await Promise.all([getEntertainmentItems(),getSongs()]);setItems(i);setSongs(s)}
  useEffect(()=>{void refresh()},[])
  useEffect(()=>{
    if(tab!=='watch'||title.trim().length<2||selectedResult?.title===title.trim()){setSuggestions([]);setSearching(false);return}
    const controller=new AbortController()
    const timer=window.setTimeout(async()=>{
      setSearching(true);setSearchError('')
      try{
        const response=await fetch(`/api/tmdb-search?q=${encodeURIComponent(title.trim())}&type=${kind}`,{signal:controller.signal})
        if(!response.ok)throw new Error(response.status===503?'Catalogue search is not configured yet.':'Search is temporarily unavailable.')
        const data=await response.json() as {results?:CatalogueResult[]}
        setSuggestions(data.results??[]);setShowSuggestions(true)
      }catch(err){
        if(err instanceof Error&&err.name==='AbortError')return
        setSuggestions([]);setSearchError(err instanceof Error?err.message:'Could not search titles.')
      }finally{if(!controller.signal.aborted)setSearching(false)}
    },350)
    return()=>{window.clearTimeout(timer);controller.abort()}
  },[title,kind,tab,selectedResult])
  function updateTitle(value:string){setTitle(value);setSelectedResult(null);setShowSuggestions(true)}
  function chooseResult(result:CatalogueResult){
    setSelectedResult(result);setTitle(result.title);setKind(result.mediaType);setSuggestions([]);setShowSuggestions(false);setSearchError('')
  }
  async function addWatch(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!title.trim())return
    const timestamp=now()
    try{
      await saveEntertainmentItem({id:crypto.randomUUID(),title:selectedResult?.title??title.trim(),type:selectedResult?.mediaType??kind,status,genres:[],createdAt:timestamp,updatedAt:timestamp,
        ...(detail.trim()?{personalNotes:detail.trim()}:{}),
        ...(selectedResult?{description:selectedResult.overview||undefined,releaseYear:selectedResult.releaseDate?Number(selectedResult.releaseDate.slice(0,4))||undefined:undefined,posterUrl:selectedResult.posterUrl??undefined,backdropUrl:selectedResult.backdropUrl??undefined,externalIds:{tmdb:String(selectedResult.id)}}:{})})
      setTitle('');setDetail('');setSelectedResult(null);setError('');await refresh()
    }catch{setError('Could not save this title.')}
  }
  async function addSong(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!title.trim())return
    const timestamp=now()
    try{await saveSong({id:crypto.randomUUID(),title:title.trim(),artists:detail.trim()?[detail.trim()]:[],categories:['want_to_listen'],createdAt:timestamp,updatedAt:timestamp});setTitle('');setDetail('');setError('');await refresh()}catch{setError('Could not save this song.')}
  }
  async function removeWatch(id:string){await deleteEntertainmentItem(id);await refresh()}
  async function removeSong(id:string){await deleteSong(id);await refresh()}
  async function changeStatus(item:EntertainmentItem,nextStatus:EntertainmentStatus){
    if(item.status===nextStatus)return
    try{await saveEntertainmentItem({...item,status:nextStatus,updatedAt:now()});await refresh()}catch{setError('Could not update this title.')}
  }
  const visibleItems=useMemo(()=>items.filter(item=>(statusFilter==='all'||item.status===statusFilter)&&(typeFilter==='all'||item.type===typeFilter)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[items,statusFilter,typeFilter])
  const counts={all:items.length,watching:items.filter(i=>i.status==='watching').length,favourite:items.filter(i=>i.status==='favourite').length,watchlist:items.filter(i=>i.status==='watchlist').length}
  const heading=statusFilter==='watching'?'Currently watching':statusFilter==='favourite'?'Your favourites':statusFilter==='watchlist'?'Your watchlist':'Movies & shows'
  const movieItems=visibleItems.filter(item=>item.type==='movie')
  const tvItems=visibleItems.filter(item=>item.type==='tv_show')
  function renderWatchShelf(label:string,shelfItems:EntertainmentItem[]){return shelfItems.length>0?<section className="watch-shelf"><div className="watch-shelf-heading"><h3>{label}</h3><span>{shelfItems.length} {shelfItems.length===1?'title':'titles'}</span></div><div className="watch-shelf-track">{shelfItems.map(item=><article className="interest-card watch-library-card" key={item.id}>{item.posterUrl&&<img className="watch-library-poster" src={item.posterUrl} alt={item.title+' poster'} loading="lazy"/>}<div className="interest-card-top"><span>{item.type==='tv_show'?'TV SHOW':'MOVIE'} · {statusLabel[item.status]}</span><button aria-label={'Delete '+item.title} onClick={()=>void removeWatch(item.id)}><Trash2 size={14}/></button></div><h3>{item.title}</h3>{item.releaseYear&&<span className="watch-library-year">{item.releaseYear}</span>}<p>{item.personalNotes||item.description||'Saved to your library.'}</p><label className="watch-card-status">MOVE TO<CustomSelect value={item.status} onChange={value=>void changeStatus(item,value as EntertainmentStatus)} options={statusOptions}/></label><div className="interest-card-foot">ADDED {new Date(item.createdAt).toLocaleDateString()}</div></article>)}</div></section>:null}
  return <div className="content inner-page whats-up-page">
    <div className="inner-kicker">YOUR SPACE · CULTURE & CURIOSITY</div>
    <h1>What's up?</h1>
    <p className="inner-description">A little home for what you're watching, what you love, and what you want to discover next.</p>
    <div className="interest-tabs"><button className={tab==='watch'?'selected':''} onClick={()=>{setTab('watch');setSuggestions([])}}><Film size={14}/> Watch <span>{items.length}</span></button><button className={tab==='listen'?'selected':''} onClick={()=>{setTab('listen');setSuggestions([])}}><Music2 size={14}/> Listen <span>{songs.length}</span></button></div>
    <form className="interest-form" onSubmit={tab==='watch'?addWatch:addSong}>
      <div className="interest-form-heading"><Plus size={16}/><strong>Add {tab==='watch'?'a movie or show':'a song'}</strong></div>
      <div className="interest-form-grid"><label>{tab==='watch'?'Search title':'Title'}<div className="catalogue-search-wrap"><input value={title} onChange={e=>tab==='watch'?updateTitle(e.target.value):setTitle(e.target.value)} onFocus={()=>{if(suggestions.length)setShowSuggestions(true)}} placeholder={tab==='watch'?'Start typing a movie or TV show…':'e.g. A song you love'} maxLength={100} autoComplete="off"/>{tab==='watch'&&<span className="catalogue-search-icon">{searching?<LoaderCircle size={15} className="catalogue-spinner"/>:<Search size={15}/>}</span>}
        {tab==='watch'&&showSuggestions&&suggestions.length>0&&<div className="catalogue-suggestions" role="listbox" aria-label="Movie and TV show suggestions">{suggestions.map(result=><button type="button" role="option" aria-selected={selectedResult?.id===result.id} className="catalogue-suggestion" key={result.id+'-'+result.mediaType} onClick={()=>chooseResult(result)}>{result.posterUrl?<img src={result.posterUrl} alt="" loading="lazy"/>:<span className="catalogue-poster-placeholder"><Film size={17}/></span>}<span className="catalogue-suggestion-copy"><strong>{result.title}</strong><small>{result.mediaType==='movie'?'Movie':'TV show'}{result.releaseDate?' · '+result.releaseDate.slice(0,4):''}</small>{result.overview&&<em>{result.overview}</em>}</span></button>)}</div>}
      </div></label>{tab==='watch'?<label>Type<CustomSelect value={kind} onChange={value=>{setKind(value as 'movie'|'tv_show');setSelectedResult(null)}} options={[{value:'movie',label:'Movie'},{value:'tv_show',label:'TV show'}]} /></label>:<label>Artist<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Artist name"/></label>}</div>
      {tab==='watch'&&<div className="interest-form-grid"><label>Status<CustomSelect value={status} onChange={value=>setStatus(value as EntertainmentStatus)} options={statusOptions} /></label><label>Notes<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Optional note"/></label></div>}
      {tab==='watch'&&<div className="catalogue-search-feedback">{searchError&&<span>{searchError}</span>}{selectedResult&&<span className="catalogue-selected">✓ Catalogue match selected · {selectedResult.releaseDate?.slice(0,4)||'Year unavailable'}</span>}{!searchError&&!selectedResult&&title.trim().length>=2&&!searching&&suggestions.length===0&&<span>No catalogue matches yet. You can still save the title manually.</span>}</div>}
      <button className="new-button" type="submit" disabled={!title.trim()}>Save {tab==='watch'?'title':'song'} <Plus size={14}/></button>
      {error&&<p className="interest-error">{error}</p>}
    </form>
    {tab==='watch'?<section className="watch-library">
      <div className="watch-library-heading"><div><span className="eyebrow muted">YOUR ENTERTAINMENT</span><h2>{heading}</h2></div><span className="watch-library-total">{visibleItems.length} {visibleItems.length===1?'title':'titles'}</span></div>
      <div className="watch-status-filters" aria-label="Filter by status">{(['all','watching','favourite','watchlist'] as WatchStatusFilter[]).map(filter=><button type="button" className={statusFilter===filter?'active':''} onClick={()=>setStatusFilter(filter)} key={filter}>{filter==='all'?'All':filter==='watching'?'Watching':filter==='favourite'?'Favourites':'Watchlist'}<span>{counts[filter]}</span></button>)}</div>
      <div className="watch-type-filters" aria-label="Filter by type"><span>SHOW</span>{(['all','movie','tv_show'] as WatchTypeFilter[]).map(filter=><button type="button" className={typeFilter===filter?'active':''} onClick={()=>setTypeFilter(filter)} key={filter}>{filter==='all'?'All':filter==='movie'?'Movies':'TV shows'}</button>)}</div>
      {visibleItems.length?<div className="watch-shelves">{typeFilter!=='tv_show'&&renderWatchShelf('Movies',movieItems)}{typeFilter!=='movie'&&renderWatchShelf('TV shows',tvItems)}</div>:<div className="interest-empty"><Film size={22}/><strong>{statusFilter==='all'?'Your library is open.':'No titles match these filters yet.'}</strong><span>{statusFilter==='all'?'Add a favourite, something you’re watching, or a title for later.':'Try another status or type filter, or add a new title above.'}</span></div>}
    </section>:<section className="watch-library"><LocalMusicPlayer songs={songs} onRefresh={refresh}/><div className="interest-list-heading"><div><span className="eyebrow muted">YOUR MUSIC NOTES</span><h2>Songs to keep close</h2></div></div>{songs.filter(song=>!song.localAudioAssetId).length?<div className="interest-grid">{songs.filter(song=>!song.localAudioAssetId).map(song=><article className="interest-card" key={song.id}><div className="interest-card-top"><span>SONG NOTE</span><button aria-label={'Delete '+song.title} onClick={()=>void removeSong(song.id)}><Trash2 size={14}/></button></div><h3>{song.title}</h3><p>{song.artists.join(', ')||'Artist not added'}</p><div className="interest-card-foot">ADDED {new Date(song.createdAt).toLocaleDateString()}</div></article>)}</div>:<div className="interest-empty"><Music2 size={22}/><strong>No saved song notes yet.</strong><span>Add a song above to keep its name and artist in your Solace library.</span></div>}</section>}
    <p className="tmdb-attribution">Movie and TV metadata provided by <strong>TMDB</strong>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </div>
}
