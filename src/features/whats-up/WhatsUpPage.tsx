import { useEffect, useState } from 'react'
import { getEntertainmentItems, saveEntertainmentItem, deleteEntertainmentItem, getSongs, saveSong, deleteSong } from '../../db'
import type { EntertainmentItem, Song } from './types'
import { Plus, Trash2, Film, Music2 } from 'lucide-react'
import CustomSelect from '../../components/ui/CustomSelect'

const now=()=>new Date().toISOString()
export default function WhatsUpPage() {
  const [items,setItems]=useState<EntertainmentItem[]>([])
  const [songs,setSongs]=useState<Song[]>([])
  const [tab,setTab]=useState<'watch'|'listen'>('watch')
  const [title,setTitle]=useState('')
  const [detail,setDetail]=useState('')
  const [status,setStatus]=useState<'favourite'|'watching'|'watchlist'>('watchlist')
  const [kind,setKind]=useState<'movie'|'tv_show'>('movie')
  const [error,setError]=useState('')
  async function refresh(){const [i,s]=await Promise.all([getEntertainmentItems(),getSongs()]);setItems(i);setSongs(s)}
  useEffect(()=>{void refresh()},[])
  async function addWatch(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!title.trim())return
    const timestamp=now()
    try{await saveEntertainmentItem({id:crypto.randomUUID(),title:title.trim(),type:kind,status,genres:[],createdAt:timestamp,updatedAt:timestamp,...(detail.trim()?{personalNotes:detail.trim()}:{})});setTitle('');setDetail('');setError('');await refresh()}catch{setError('Could not save this title.')}
  }
  async function addSong(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!title.trim())return
    const timestamp=now()
    try{await saveSong({id:crypto.randomUUID(),title:title.trim(),artists:detail.trim()?[detail.trim()]:[],categories:['want_to_listen'],createdAt:timestamp,updatedAt:timestamp});setTitle('');setDetail('');setError('');await refresh()}catch{setError('Could not save this song.')}
  }
  async function removeWatch(id:string){await deleteEntertainmentItem(id);await refresh()}
  async function removeSong(id:string){await deleteSong(id);await refresh()}
  const visible=items.filter(item=>tab==='watch')
  return <div className="content inner-page whats-up-page">
    <div className="inner-kicker">YOUR SPACE · CULTURE & CURIOSITY</div>
    <h1>What's up?</h1>
    <p className="inner-description">A little home for what you're watching, what you love, and what you want to discover next.</p>
    <div className="interest-tabs"><button className={tab==='watch'?'selected':''} onClick={()=>setTab('watch')}><Film size={14}/> Watch <span>{items.length}</span></button><button className={tab==='listen'?'selected':''} onClick={()=>setTab('listen')}><Music2 size={14}/> Listen <span>{songs.length}</span></button></div>
    <form className="interest-form" onSubmit={tab==='watch'?addWatch:addSong}>
      <div className="interest-form-heading"><Plus size={16}/><strong>Add {tab==='watch'?'a movie or show':'a song'}</strong></div>
      <div className="interest-form-grid"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={tab==='watch'?'e.g. Interstellar':'e.g. A song you love'} maxLength={100}/></label>{tab==='watch'?<label>Type<CustomSelect value={kind} onChange={value=>setKind(value as 'movie'|'tv_show')} options={[{value:"movie",label:"Movie"},{value:"tv_show",label:"TV show"}]} /></label>:<label>Artist<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Artist name"/></label>}</div>
      {tab==='watch'&&<div className="interest-form-grid"><label>Status<CustomSelect value={status} onChange={value=>setStatus(value as typeof status)} options={[{value:"watchlist",label:"Watchlist"},{value:"watching",label:"Currently watching"},{value:"favourite",label:"Favourite"}]} /></label><label>Notes<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Optional note"/></label></div>}
      <button className="new-button" type="submit" disabled={!title.trim()}>Save {tab==='watch'?'title':'song'} <Plus size={14}/></button>
      {error&&<p className="interest-error">{error}</p>}
    </form>
    <div className="interest-list-heading"><div><span className="eyebrow muted">{tab==='watch'?'YOUR WATCHLIST':'YOUR MUSIC'}</span><h2>{tab==='watch'?'Movies & shows':'Songs to keep close'}</h2></div></div>
    {tab==='watch'?<div className="interest-grid">{visible.length?visible.map(item=><article className="interest-card" key={item.id}><div className="interest-card-top"><span>{item.type==='tv_show'?'TV SHOW':'MOVIE'} · {item.status.replace('_',' ')}</span><button aria-label={'Delete '+item.title} onClick={()=>void removeWatch(item.id)}><Trash2 size={14}/></button></div><h3>{item.title}</h3><p>{item.personalNotes||'Saved to your list.'}</p><div className="interest-card-foot">ADDED {new Date(item.createdAt).toLocaleDateString()}</div></article>):<div className="interest-empty"><Film size={22}/><strong>Your watchlist is open.</strong><span>Add a favourite, something you're watching, or a title for later.</span></div>}</div>:<div className="interest-grid">{songs.length?songs.map(song=><article className="interest-card" key={song.id}><div className="interest-card-top"><span>SONG</span><button aria-label={'Delete '+song.title} onClick={()=>void removeSong(song.id)}><Trash2 size={14}/></button></div><h3>{song.title}</h3><p>{song.artists.join(', ')||'Artist not added'}</p><div className="interest-card-foot">ADDED {new Date(song.createdAt).toLocaleDateString()}</div></article>):<div className="interest-empty"><Music2 size={22}/><strong>Your music space is quiet for now.</strong><span>Add songs you'd like to remember or listen to later.</span></div>}</div>}
  </div>
}
