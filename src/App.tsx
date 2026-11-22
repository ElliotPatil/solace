import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Aperture, BookOpen, Brain, ChevronRight, Compass, Film, FolderHeart, House, Menu, Plus, Search, Settings2, Sparkles, X, Feather, Pencil, Lock, Trash2, Layers, Star, ArrowLeft, Link2 } from 'lucide-react'
import { deleteEntry, getEntries, saveEntry, getCollections, saveCollection, deleteCollection, type Entry, type EntryKind, type Privacy, type Collection } from './db'

const sections = [
  { id: 'Sanctuary', icon: House }, { id: 'Discover', icon: Compass }, { id: 'Reflect', icon: Feather },
  { id: 'Memories', icon: BookOpen }, { id: 'Experiences', icon: Film }, { id: 'Collections', icon: FolderHeart },
  { id: 'Universe', icon: Aperture }, { id: 'AI companion', icon: Sparkles },
]
const copy: Record<string, string> = {
  Sanctuary: 'A place to simply be.', Discover: 'There is always more to understand about yourself.',
  Reflect: 'A little space for whatever is on your mind.', Memories: 'Keep the moments you want to carry with you.',
  Experiences: 'A life is made of things lived, not boxes ticked.', Collections: 'Gather the things that mean something to you.',
  Universe: 'Your life, connected in its own way.', 'AI companion': 'A thoughtful space to explore an idea, when you choose.',
}
const prompts = [
  'What is something small you want to remember about today?',
  'What idea has been quietly staying with you lately?',
  'What place makes you feel most like yourself?',
  'What would you tell your younger self about this season of life?',
  'What are you curious about, just for the joy of it?',
  'What is something you noticed recently that you usually overlook?',
]
const discoveries = [
  { title: 'A little curiosity', body: 'Follow a question without needing to turn it into a goal.', prompt: 'What have I been curious about lately?' },
  { title: 'A place in your mind', body: 'Places can hold feelings, stories and versions of ourselves.', prompt: 'Describe a place that means something to you.' },
  { title: 'A tiny detail', body: 'Sometimes the smallest details become the memories we keep.', prompt: 'What detail from today would you like to preserve?' },
  { title: 'A new perspective', body: 'Try looking at a familiar thought from another angle.', prompt: 'What might I be seeing differently these days?' },
]
function App() {
  const [active, setActive] = useState('Sanctuary')
  const [entries, setEntries] = useState<Entry[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [kind, setKind] = useState<EntryKind>('memory')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('private')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDesc, setCollectionDesc] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [attachCollection, setAttachCollection] = useState('')
  const [promptDraft, setPromptDraft] = useState('')
  async function refresh() {
    try { setEntries(await getEntries()); setCollections(await getCollections()) } catch { /* offline storage unavailable */ }
  }
  useEffect(() => { void refresh() }, [])
  const filtered = useMemo(() => entries.filter(e => (e.title + ' ' + e.body).toLowerCase().includes(query.toLowerCase())), [entries, query])
  const recent = entries.slice(0, 3)
  async function createEntry(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() && !body.trim()) return
    const existing = editingId ? entries.find(entry=>entry.id===editingId) : undefined
    await saveEntry({ id: editingId || crypto.randomUUID(), kind, title: title.trim() || 'Untitled', body: body.trim(), createdAt: existing?.createdAt || new Date().toISOString(), privacy, collectionId: attachCollection || undefined })
    setTitle(''); setBody(''); setPrivacy('private'); setAttachCollection(''); setEditingId(null); setShowComposer(false); await refresh()
  }
  function editEntry(entry:Entry) {
    setEditingId(entry.id); setKind(entry.kind); setTitle(entry.title); setBody(entry.body); setPrivacy(entry.privacy); setAttachCollection(entry.collectionId || ''); setShowComposer(true)
  }
  function closeComposer() { setShowComposer(false); setEditingId(null); setTitle(''); setBody(''); setPrivacy('private'); setAttachCollection('') }
  async function removeEntry(id: string) { await deleteEntry(id); await refresh() }
  async function createCollection(event: FormEvent) {
    event.preventDefault(); if (!collectionName.trim()) return
    await saveCollection({ id: crypto.randomUUID(), name: collectionName.trim(), description: collectionDesc.trim(), createdAt: new Date().toISOString() })
    setCollectionName(''); setCollectionDesc(''); await refresh()
  }
  async function removeCollection(id: string) { await deleteCollection(id); if(selectedCollection===id) setSelectedCollection(null); await refresh() }
  function startPrompt(text: string, entryKind: EntryKind='reflection') { setKind(entryKind); settitleAndPrompt(text); setShowComposer(true) }
  function settitleAndPrompt(text: string) { setTitle(''); setBody(text); setPromptDraft(text); }
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const typeIcon = (k: EntryKind) => k === 'experience' ? <Film size={16}/> : k === 'reflection' ? <Feather size={16}/> : <BookOpen size={16}/>
  const entryCard = (entry: Entry) => <article className="entry-card" key={entry.id}><div className="entry-symbol">{typeIcon(entry.kind)}</div><div className="entry-info"><div className="entry-title">{entry.title}</div><div className="entry-meta">{entry.kind} · {new Date(entry.createdAt).toLocaleDateString()} {entry.privacy==='private'?'· private':''}</div>{entry.body && <p>{entry.body}</p>}</div><button className="edit-button" aria-label="Edit entry" onClick={() => editEntry(entry)}><Pencil size={14}/></button><button className="delete-button" aria-label="Delete entry" onClick={() => void removeEntry(entry.id)}><Trash2 size={14}/></button></article>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><img className="brand-image" src="/icons/solace-192.png" alt="Solace" /></div><span>solace</span></div>
        <div className="side-caption">YOUR SPACE</div><nav>{sections.map(({id,icon:Icon})=><button key={id} className={`nav-item ${active===id?'active':''}`} onClick={()=>{setActive(id);setMenuOpen(false);setSelectedCollection(null)}}><Icon size={17} strokeWidth={1.65}/><span>{id}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="privacy-note"><Lock size={14}/><span>Stored on this device.</span></div><button className="nav-item settings" onClick={()=>setActive('Settings')}><Settings2 size={17}/><span>Settings</span></button><div className="side-foot">A PLACE TO SIMPLY BE</div></div>
      </aside>
      {menuOpen&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
      <main className="main">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button><div className="breadcrumb">SOLACE <span>/</span> {active.toUpperCase()}</div><div className="top-actions"><button className="icon-button" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}><Search size={18}/></button><button className="new-button" onClick={()=>{setKind(active==='Reflect'?'reflection':active==='Experiences'?'experience':'memory');setShowComposer(true)}}><Plus size={16}/><span>New entry</span></button></div></header>
        {searchOpen&&<div className="search-panel"><Search size={16}/><input autoFocus placeholder="Search your universe..." value={query} onChange={e=>setQuery(e.target.value)}/><button className="icon-button" onClick={()=>{setSearchOpen(false);setQuery('')}}><X size={16}/></button></div>}
        {active==='Sanctuary'&&<div className="content sanctuary"><section className="hero"><div className="hero-glow"/><div className="hero-stars"/><div className="hero-content"><div className="eyebrow"><span className="eyebrow-dot"/> {date.toUpperCase()}</div><h1>Welcome <em>home.</em></h1><p className="hero-subtitle">A quiet corner of the universe, just for you.</p><button className="hero-cta" onClick={()=>{setEditingId(null);setShowComposer(true)}}>Leave a little note <ChevronRight size={16}/></button></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-orb"/><div className="hero-footnote">TAKE YOUR TIME <span>✳</span> THERE IS NO RUSH</div></section>
          <section className="lower-grid"><div className="section-block"><div className="section-heading"><div><div className="eyebrow muted">A LITTLE ARCHIVE</div><h2>Recently remembered</h2></div><button className="text-link" onClick={()=>setActive('Memories')}>View all <ChevronRight size={14}/></button></div>{recent.length?<div className="entry-list">{recent.map(entryCard)}</div>:<div className="empty-state"><span className="empty-star">✳</span><p>Your story will find its way here.</p><button onClick={()=>setShowComposer(true)}>Save your first memory <ChevronRight size={14}/></button></div>}</div>
          <div className="section-block universe-card"><div className="eyebrow muted">YOUR UNIVERSE</div><h2>{entries.length?entries.length+' moments, and counting.':'Everything is connected.'}</h2><div className="constellation"><span className="constellation-line line-a"/><span className="constellation-line line-b"/>{entries.slice(0,9).map((e,i)=><i key={e.id} className="star" style={{left:(15+(i*31)%75)+'%',top:(12+(i*47)%75)+'%'}}/>)}<div className="constellation-core"><Aperture size={22}/></div></div><button className="text-link" onClick={()=>setActive('Universe')}>Wander through your universe <ChevronRight size={14}/></button></div></section></div>}
        {active==='Memories'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · MEMORIES</div><h1>Keep what matters.</h1><p className="inner-description">A small archive of moments you'd like to carry.</p><button className="new-button page-new" onClick={()=>{setKind('memory');setShowComposer(true)}}><Plus size={16}/> New memory</button><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='memory').map(entryCard)}</div></div>}
        {active==='Reflect'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · REFLECT</div><h1>Make room for a thought.</h1><p className="inner-description">No right answer. No need to finish. Just a little room to notice.</p><div className="reflect-prompt"><div className="eyebrow muted">A THOUGHT TO SIT WITH</div><p>{prompts[Math.floor((new Date().getDate()+new Date().getMonth())%prompts.length)]}</p><button className="hero-cta" onClick={()=>startPrompt(prompts[Math.floor((new Date().getDate()+new Date().getMonth())%prompts.length)])}>Write about this <ChevronRight size={15}/></button></div><div className="section-heading" style={{marginTop:45}}><div><div className="eyebrow muted">YOUR REFLECTIONS</div><h2>Things on your mind</h2></div></div><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='reflection').map(entryCard)}</div></div>}
        {active==='Experiences'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · EXPERIENCES</div><h1>Life, as it happens.</h1><p className="inner-description">Save the trips, firsts, ordinary days, and stories you want to remember.</p><button className="new-button page-new" onClick={()=>{setKind('experience');setShowComposer(true)}}><Plus size={16}/> Capture experience</button><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='experience').map(entryCard)}</div></div>}
        {active==='Discover'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · DISCOVER</div><h1>Follow what fascinates you.</h1><p className="inner-description">Gentle invitations to explore ideas, places and questions. Nothing to complete.</p><div className="discover-grid">{discoveries.map((d,i)=><article className="discover-card" key={d.title}><div className="eyebrow muted">0{i+1} · OPEN ENDED</div><h2>{d.title}</h2><p>{d.body}</p><button className="hero-cta" onClick={()=>startPrompt(d.prompt)}>Explore this <ChevronRight size={15}/></button></article>)}</div></div>}
        {active==='Collections'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · COLLECTIONS</div><h1>Gather your own constellations.</h1><p className="inner-description">Loose collections for things that belong together, for whatever reason you decide.</p><form className="collection-form" onSubmit={createCollection}><input placeholder="Collection name" value={collectionName} onChange={e=>setCollectionName(e.target.value)}/><input placeholder="A note about it (optional)" value={collectionDesc} onChange={e=>setCollectionDesc(e.target.value)}/><button className="new-button" type="submit"><Plus size={15}/> Create collection</button></form>{selectedCollection? <><button className="text-link" onClick={()=>setSelectedCollection(null)}><ArrowLeft size={14}/> All collections</button><h2>{collections.find(c=>c.id===selectedCollection)?.name}</h2><p className="entry-meta">{collections.find(c=>c.id===selectedCollection)?.description}</p><div className="entry-list page-entries">{entries.filter(e=>e.collectionId===selectedCollection).map(entryCard)}</div></>:<div className="collections-grid">{collections.map(c=><article className="collection-card" key={c.id}><button className="delete-button" onClick={()=>void removeCollection(c.id)} aria-label="Delete collection"><Trash2 size={14}/></button><FolderHeart size={20}/><h2>{c.name}</h2><p>{c.description||'A collection of things that feel connected.'}</p><div className="entry-meta">{entries.filter(e=>e.collectionId===c.id).length} items</div><button className="hero-cta" onClick={()=>setSelectedCollection(c.id)}>Open collection <ChevronRight size={15}/></button></article>)}</div>}</div>}
        {active==='Universe'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · UNIVERSE</div><h1>Your life, in little stars.</h1><p className="inner-description">A quiet constellation made from things you've saved. Each point is a moment; none needs to be connected yet.</p><div className="universe-map">{entries.slice(0,32).map((e,i)=><button title={e.title} key={e.id} className="universe-star" style={{left:(7+(i*37)%85)+'%',top:(8+(i*53)%83)+'%'}} onClick={()=>{setActive(e.kind==='memory'?'Memories':e.kind==='reflection'?'Reflect':'Experiences');setQuery(e.title)}}><span/></button>)}<div className="universe-center"><Aperture size={28}/><span>solace</span></div></div><div className="entry-list page-entries">{entries.slice(0,12).map(entryCard)}</div></div>}
        {active==='AI companion'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · OPTIONAL AI</div><h1>Thoughtful, not intrusive.</h1><p className="inner-description">The companion is not connected yet. When it is, it'll be opt-in, and private entries will remain excluded by design.</p><div className="coming-soon"><Lock size={17}/><span>AI is not active. No entries are sent anywhere.</span></div></div>}
        {active==='Settings'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · SETTINGS</div><h1>Your space stays yours.</h1><p className="inner-description">Solace currently stores your entries locally in this browser on this device. No cloud sync or AI sharing is active.</p><div className="settings-info"><div><Lock size={17}/><strong>Local storage</strong><span>Entries are saved in this browser's IndexedDB.</span></div><div><Layers size={17}/><strong>Export your data</strong><span>Download a JSON backup of your memories, reflections, experiences and collections.</span><button className="hero-cta" onClick={()=>{const payload=JSON.stringify({exportedAt:new Date().toISOString(),entries,collections},null,2);const blob=new Blob([payload],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='solace-backup.json';a.click();URL.revokeObjectURL(a.href)}}>Export backup <ChevronRight size={15}/></button></div><div><Link2 size={17}/><strong>Restore backup</strong><span>Restore a previously exported JSON backup. This will add the records to your local archive.</span><input type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());for(const item of (parsed.entries||[]))await saveEntry(item);for(const item of (parsed.collections||[]))await saveCollection(item);await refresh();alert('Backup restored.')}catch{alert('Invalid backup file.')}}}/></div></div></div>}
      </main>
      {showComposer&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeComposer()}}><form className="composer" onSubmit={createEntry}><div className="composer-top"><div><div className="eyebrow muted">A MOMENT TO KEEP</div><h2>{editingId?'Edit this moment.':'Leave something here.'}</h2></div><button type="button" className="icon-button" onClick={closeComposer}><X size={18}/></button></div><div className="kind-tabs">{(['memory','reflection','experience'] as EntryKind[]).map(k=><button type="button" className={kind===k?'selected':''} onClick={()=>setKind(k)} key={k}>{k}</button>)}</div><input className="composer-title" placeholder="Give this moment a name..." value={title} onChange={e=>setTitle(e.target.value)}/><textarea placeholder="Whatever you'd like to remember..." value={body} onChange={e=>setBody(e.target.value)} rows={5}/><label className="privacy-select">Who can access this? <select value={privacy} onChange={e=>setPrivacy(e.target.value as Privacy)}><option value="private">Private — excluded from AI</option><option value="ai-readable">AI-readable — only if AI is enabled</option><option value="shareable">Shareable — only when I choose to share</option></select></label>{collections.length>0&&<label className="privacy-select">Add to a collection<select value={attachCollection} onChange={e=>setAttachCollection(e.target.value)}><option value="">None</option>{collections.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}<div className="composer-footer"><span><Lock size={13}/> Saved on this device</span><button className="new-button" type="submit">Save gently <ChevronRight size={15}/></button></div></form></div>}
    </div>
  )
}
export default App
