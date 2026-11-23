import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { ensureUserProfile } from './userProfile'
import { Aperture, BookOpen, Brain, ChevronRight, Compass, Film, FolderHeart, House, Menu, Plus, Search, Settings2, Sparkles, X, Feather, Pencil, Lock, Trash2, Layers, Star, ArrowLeft, Link2, Pin, Tag, UserCircle, Palette, Upload, RotateCcw } from 'lucide-react'
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
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [kind, setKind] = useState<EntryKind>('memory')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('private')
  const [memoryTags, setMemoryTags] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDesc, setCollectionDesc] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [attachCollection, setAttachCollection] = useState('')
  const [promptDraft, setPromptDraft] = useState('')
  const [profileName, setProfileName] = useState(() => { try { return localStorage.getItem('solace-profile-name') || '' } catch { return '' } })
  const [profileBio, setProfileBio] = useState(() => { try { return localStorage.getItem('solace-profile-bio') || '' } catch { return '' } })
  const [profileAvatar, setProfileAvatar] = useState(() => { try { return localStorage.getItem('solace-profile-avatar') || '' } catch { return '' } })
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('solace-theme') || 'midnight' } catch { return 'midnight' } })
  const [profileSaved, setProfileSaved] = useState(false)
  const themeColors: Record<string,string> = { midnight:'#aeb8c8', gold:'#c8aa68', blue:'#8db6e8', orange:'#d99762' }
  useEffect(() => { document.documentElement.style.setProperty('--accent', themeColors[theme] || themeColors.midnight); try { localStorage.setItem('solace-theme', theme) } catch {} }, [theme])
  function saveProfile() {
    try { localStorage.setItem('solace-profile-name', profileName.trim()); localStorage.setItem('solace-profile-bio', profileBio.trim()); localStorage.setItem('solace-profile-avatar', profileAvatar); setProfileSaved(true); window.setTimeout(() => setProfileSaved(false), 2200) }
    catch { setAuthMessage('Profile could not be saved on this device.') }
  }
  async function handleAvatarFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setAuthMessage('Choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => { const image = new Image(); image.onload = () => { const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=256; const ctx=canvas.getContext('2d'); if(!ctx)return; const crop=Math.min(image.width,image.height); ctx.drawImage(image,(image.width-crop)/2,(image.height-crop)/2,crop,crop,0,0,256,256); setProfileAvatar(canvas.toDataURL('image/jpeg',.82)); setAuthMessage('Profile picture ready. Save your profile to keep it.') }; image.src=String(reader.result) }
    reader.readAsDataURL(file)
  }
  async function refresh() {
    try { setEntries(await getEntries()); setCollections(await getCollections()) } catch { /* offline storage unavailable */ }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setAuthUser(user)
      setAuthLoading(false)
    }, () => {
      setAuthMessage('Could not check your account status. Please try again.')
      setAuthLoading(false)
    })
  }, [])
  async function handleGoogleSignIn() {
    setAuthBusy(true)
    setAuthMessage('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureUserProfile(result.user)
      setAuthMessage('Your Solace account is connected.')
    } catch (error) {
      const code = (error as { code?: string }).code
      setAuthMessage(code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : code === 'auth/unauthorized-domain' ? 'This domain is not yet authorized in Firebase. Add it in Authentication settings.' : 'Sign-in could not be completed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }
  async function handleSignOut() {
    setAuthBusy(true)
    setAuthMessage('')
    try {
      await signOut(auth)
      setAuthMessage('You are signed out.')
    } catch {
      setAuthMessage('Could not sign out right now. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }
  const filtered = useMemo(() => entries.filter(e => (e.title + ' ' + e.body + ' ' + (e.tags || []).join(' ')).toLowerCase().includes(query.toLowerCase())), [entries, query])
  const recent = entries.slice(0, 3)
  const pinnedMemories = useMemo(() => filtered.filter(entry => entry.kind === 'memory' && entry.pinned), [filtered])
  const memoryGroups = useMemo(() => {
    const memories = filtered.filter(entry => entry.kind === 'memory' && !entry.pinned)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const groups = new Map<string, { label: string; entries: Entry[] }>()
    memories.forEach(entry => {
      const date = new Date(entry.createdAt)
      const day = new Date(date)
      day.setHours(0, 0, 0, 0)
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
      const label = day.getTime() === today.getTime()
        ? 'Today'
        : day.getTime() === yesterday.getTime()
          ? 'Yesterday'
          : new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(day)
      if (!groups.has(key)) groups.set(key, { label, entries: [] })
      groups.get(key)!.entries.push(entry)
    })
    return Array.from(groups.values())
  }, [filtered])
  async function createEntry(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() && !body.trim()) return
    const existing = editingId ? entries.find(entry=>entry.id===editingId) : undefined
    const tags = kind === 'memory' ? Array.from(new Set(memoryTags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))).slice(0, 12) : undefined
    await saveEntry({ id: editingId || crypto.randomUUID(), kind, title: title.trim() || 'Untitled', body: body.trim(), createdAt: existing?.createdAt || new Date().toISOString(), privacy, collectionId: attachCollection || undefined, pinned: kind === 'memory' ? existing?.pinned || false : undefined, tags })
    setTitle(''); setBody(''); setPrivacy('private'); setMemoryTags(''); setAttachCollection(''); setEditingId(null); setShowComposer(false); await refresh()
  }
  function editEntry(entry:Entry) {
    setEditingId(entry.id); setKind(entry.kind); setTitle(entry.title); setBody(entry.body); setPrivacy(entry.privacy); setMemoryTags((entry.tags || []).join(', ')); setAttachCollection(entry.collectionId || ''); setShowComposer(true)
  }
  function closeComposer() { setShowComposer(false); setEditingId(null); setTitle(''); setBody(''); setPrivacy('private'); setMemoryTags(''); setAttachCollection('') }
  async function togglePinned(entry: Entry) { await saveEntry({ ...entry, pinned: !entry.pinned }); await refresh() }
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
  const entryCard = (entry: Entry) => <article className="entry-card" key={entry.id}><div className="entry-symbol">{typeIcon(entry.kind)}</div><div className="entry-info"><div className="entry-title">{entry.title}</div><div className="entry-meta">{entry.kind} · {new Date(entry.createdAt).toLocaleDateString()} {entry.privacy==='private'?'· private':''}</div>{entry.body && <p>{entry.body}</p>}{entry.kind === 'memory' && !!entry.tags?.length && <div className="memory-tags">{entry.tags.map(tag => <span className="memory-tag" key={tag}><Tag size={10}/>{tag}</span>)}</div>}</div>{entry.kind === 'memory' && <button type="button" className={`pin-button ${entry.pinned ? 'is-pinned' : ''}`} aria-label={entry.pinned ? 'Unpin memory' : 'Pin memory'} title={entry.pinned ? 'Unpin memory' : 'Pin memory'} onClick={() => void togglePinned(entry)}><Pin size={14}/></button>}<button type="button" className="edit-button" aria-label="Edit entry" onClick={() => editEntry(entry)}><Pencil size={14}/></button><button type="button" className="delete-button" aria-label="Delete entry" onClick={() => void removeEntry(entry.id)}><Trash2 size={14}/></button></article>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><img className="brand-image" src="/icons/solace-192.png" alt="" aria-hidden="true" /></div><span>solace</span></div>
        <div className="side-caption">YOUR SPACE</div><nav>{sections.map(({id,icon:Icon})=><button key={id} className={`nav-item ${active===id?'active':''}`} onClick={()=>{setActive(id);setMenuOpen(false);setSelectedCollection(null)}}><Icon size={17} strokeWidth={1.65}/><span>{id}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="privacy-note"><Lock size={14}/><span>Stored on this device.</span></div><button className="nav-item settings" onClick={()=>setActive('Settings')}><Settings2 size={17}/><span>Settings</span></button><div className="side-foot">A PLACE TO SIMPLY BE</div></div>
      </aside>
      {menuOpen&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
      <main className="main">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button><div className="breadcrumb">SOLACE <span>/</span> {active.toUpperCase()}</div><div className="top-actions"><button className="icon-button" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}><Search size={18}/></button><button className="nav-account-button" onClick={()=>{setActive('Account');setMenuOpen(false)}}>{authLoading?'Account':authUser?'Account':'Sign in'} <UserCircle size={14}/></button><button className="new-button" onClick={()=>{setKind(active==='Reflect'?'reflection':active==='Experiences'?'experience':'memory');setShowComposer(true)}}><Plus size={16}/><span>New entry</span></button></div></header>
        {searchOpen&&<div className="search-panel"><Search size={16}/><input autoFocus placeholder="Search your universe..." value={query} onChange={e=>setQuery(e.target.value)}/><button className="icon-button" onClick={()=>{setSearchOpen(false);setQuery('')}}><X size={16}/></button></div>}

        {active==='Account'&&<div className="content inner-page account-page"><div className="inner-kicker">YOUR SPACE · ACCOUNT</div><h1>{authUser?'Welcome back.':'A space of your own.'}</h1><p className="inner-description">{authUser?'Your Solace account is connected. Your entries still remain on this device.':'Create an account or sign in to connect your profile to Solace. Your entries stay local for now — signing in does not upload them.'}</p><div className="account-page-card"><div className="account-page-icon">{profileAvatar?<img className="account-avatar-thumb" src={profileAvatar} alt="Profile"/>:<UserCircle size={24}/>}</div>{authLoading?<p>Checking your account…</p>:authUser?<><div className="account-page-name">{profileName||authUser.displayName||'Signed in'}</div><div className="account-page-email">{authUser.email}</div><button className="hero-cta" onClick={()=>setActive('Profile')}>Edit profile <ChevronRight size={16}/></button><button className="hero-cta" disabled={authBusy} onClick={()=>void handleSignOut()}>{authBusy?'Signing out…':'Sign out'} <ChevronRight size={16}/></button></>:<><button className="google-signin-button" disabled={authBusy} onClick={()=>void handleGoogleSignIn()}><span className="google-mark">G</span>{authBusy?'Connecting…':'Continue with Google'}</button><p className="account-page-note">Secure sign-in powered by Google and Firebase.</p><button className="hero-cta" onClick={()=>setActive('Profile')}>Set up your profile <ChevronRight size={16}/></button></>}{authMessage&&<div className="account-message" role="status">{authMessage}</div>}</div><button className="account-back-link" onClick={()=>setActive('Sanctuary')}><ArrowLeft size={14}/> Back to your sanctuary</button></div>}
        {active==='Sanctuary'&&<div className="content sanctuary"><section className="hero"><div className="hero-glow"/><div className="hero-stars"/><div className="hero-content"><div className="eyebrow"><span className="eyebrow-dot"/> {date.toUpperCase()}</div><h1>Welcome <em>home.</em></h1><p className="hero-subtitle">A quiet corner of the universe, just for you.</p><button className="hero-cta" onClick={()=>{setEditingId(null);setShowComposer(true)}}>Leave a little note <ChevronRight size={16}/></button></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-orb"/><div className="hero-footnote">TAKE YOUR TIME <span>✳</span> THERE IS NO RUSH</div></section>
          <section className="lower-grid"><div className="section-block"><div className="section-heading"><div><div className="eyebrow muted">A LITTLE ARCHIVE</div><h2>Recently remembered</h2></div><button className="text-link" onClick={()=>setActive('Memories')}>View all <ChevronRight size={14}/></button></div>{recent.length?<div className="entry-list">{recent.map(entryCard)}</div>:<div className="empty-state"><span className="empty-star">✳</span><p>Your story will find its way here.</p><button onClick={()=>setShowComposer(true)}>Save your first memory <ChevronRight size={14}/></button></div>}</div>
          <div className="section-block universe-card"><div className="eyebrow muted">YOUR UNIVERSE</div><h2>{entries.length?entries.length+' moments, and counting.':'Everything is connected.'}</h2><div className="constellation"><span className="constellation-line line-a"/><span className="constellation-line line-b"/>{entries.slice(0,9).map((e,i)=><i key={e.id} className="star" style={{left:(15+(i*31)%75)+'%',top:(12+(i*47)%75)+'%'}}/>)}<div className="constellation-core"><Aperture size={22}/></div></div><button className="text-link" onClick={()=>setActive('Universe')}>Wander through your universe <ChevronRight size={14}/></button></div></section></div>}
        {active==='Memories'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · MEMORIES</div><h1>Keep what matters.</h1><p className="inner-description">A small archive of moments you'd like to carry.</p><button className="new-button page-new" onClick={()=>{setKind('memory');setShowComposer(true)}}><Plus size={16}/> New memory</button><div className="memory-timeline page-entries">{pinnedMemories.length > 0 && <section className="pinned-memories"><div className="pinned-heading"><Pin size={13}/><h2>Pinned memories</h2><span>{pinnedMemories.length}</span></div><div className="entry-list">{pinnedMemories.map(entryCard)}</div></section>}{memoryGroups.length ? memoryGroups.map(group=><section className="memory-day" key={group.label}><div className="memory-day-heading"><span className="memory-day-dot"/><h2>{group.label}</h2><span className="memory-day-count">{group.entries.length} {group.entries.length===1?'moment':'moments'}</span></div><div className="entry-list">{group.entries.map(entryCard)}</div></section>) : pinnedMemories.length === 0 ? <div className="memory-empty"><span className="empty-star">✳</span><p>{query ? 'No memories found for that search.' : 'Some moments are worth keeping.'}</p><span>{query ? 'Try another word or phrase.' : 'Whenever you are ready, leave a little piece of today here.'}</span>{!query&&<button className="hero-cta" onClick={()=>{setKind('memory');setShowComposer(true)}}>Save your first memory <ChevronRight size={14}/></button>}</div> : null}</div></div>}
        {active==='Reflect'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · REFLECT</div><h1>Make room for a thought.</h1><p className="inner-description">No right answer. No need to finish. Just a little room to notice.</p><div className="reflect-prompt"><div className="eyebrow muted">A THOUGHT TO SIT WITH</div><p>{prompts[Math.floor((new Date().getDate()+new Date().getMonth())%prompts.length)]}</p><button className="hero-cta" onClick={()=>startPrompt(prompts[Math.floor((new Date().getDate()+new Date().getMonth())%prompts.length)])}>Write about this <ChevronRight size={15}/></button></div><div className="section-heading" style={{marginTop:45}}><div><div className="eyebrow muted">YOUR REFLECTIONS</div><h2>Things on your mind</h2></div></div><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='reflection').map(entryCard)}</div></div>}
        {active==='Experiences'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · EXPERIENCES</div><h1>Life, as it happens.</h1><p className="inner-description">Save the trips, firsts, ordinary days, and stories you want to remember.</p><button className="new-button page-new" onClick={()=>{setKind('experience');setShowComposer(true)}}><Plus size={16}/> Capture experience</button><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='experience').map(entryCard)}</div></div>}
        {active==='Discover'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · DISCOVER</div><h1>Follow what fascinates you.</h1><p className="inner-description">Gentle invitations to explore ideas, places and questions. Nothing to complete.</p><div className="discover-grid">{discoveries.map((d,i)=><article className="discover-card" key={d.title}><div className="eyebrow muted">0{i+1} · OPEN ENDED</div><h2>{d.title}</h2><p>{d.body}</p><button className="hero-cta" onClick={()=>startPrompt(d.prompt)}>Explore this <ChevronRight size={15}/></button></article>)}</div></div>}
        {active==='Collections'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · COLLECTIONS</div><h1>Gather your own constellations.</h1><p className="inner-description">Loose collections for things that belong together, for whatever reason you decide.</p><form className="collection-form" onSubmit={createCollection}><input placeholder="Collection name" value={collectionName} onChange={e=>setCollectionName(e.target.value)}/><input placeholder="A note about it (optional)" value={collectionDesc} onChange={e=>setCollectionDesc(e.target.value)}/><button className="new-button" type="submit"><Plus size={15}/> Create collection</button></form>{selectedCollection? <><button className="text-link" onClick={()=>setSelectedCollection(null)}><ArrowLeft size={14}/> All collections</button><h2>{collections.find(c=>c.id===selectedCollection)?.name}</h2><p className="entry-meta">{collections.find(c=>c.id===selectedCollection)?.description}</p><div className="entry-list page-entries">{entries.filter(e=>e.collectionId===selectedCollection).map(entryCard)}</div></>:<div className="collections-grid">{collections.map(c=><article className="collection-card" key={c.id}><button className="delete-button" onClick={()=>void removeCollection(c.id)} aria-label="Delete collection"><Trash2 size={14}/></button><FolderHeart size={20}/><h2>{c.name}</h2><p>{c.description||'A collection of things that feel connected.'}</p><div className="entry-meta">{entries.filter(e=>e.collectionId===c.id).length} items</div><button className="hero-cta" onClick={()=>setSelectedCollection(c.id)}>Open collection <ChevronRight size={15}/></button></article>)}</div>}</div>}
        {active==='Universe'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · UNIVERSE</div><h1>Your life, in little stars.</h1><p className="inner-description">A quiet constellation made from things you've saved. Each point is a moment; none needs to be connected yet.</p><div className="universe-map">{entries.slice(0,32).map((e,i)=><button title={e.title} key={e.id} className="universe-star" style={{left:(7+(i*37)%85)+'%',top:(8+(i*53)%83)+'%'}} onClick={()=>{setActive(e.kind==='memory'?'Memories':e.kind==='reflection'?'Reflect':'Experiences');setQuery(e.title)}}><span/></button>)}<div className="universe-center"><Aperture size={28}/><span>solace</span></div></div><div className="entry-list page-entries">{entries.slice(0,12).map(entryCard)}</div></div>}
        {active==='AI companion'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · OPTIONAL AI</div><h1>Thoughtful, not intrusive.</h1><p className="inner-description">The companion is not connected yet. When it is, it'll be opt-in, and private entries will remain excluded by design.</p><div className="coming-soon"><Lock size={17}/><span>AI is not active. No entries are sent anywhere.</span></div></div>}
        {active==='Settings'&&<div className="content inner-page settings-page"><div className="inner-kicker">YOUR SPACE · SETTINGS</div><h1>Make Solace yours.</h1><p className="inner-description">Quiet controls for the way your space looks, runs, and keeps your data.</p>
<section className="settings-section"><div className="settings-section-title"><Palette size={17}/><div><strong>Appearance</strong><span>Choose an accent. The dark canvas stays dark.</span></div></div><div className="theme-options">{[{id:'midnight',name:'Midnight',color:'#aeb8c8'},{id:'gold',name:'Gold',color:'#c8aa68'},{id:'blue',name:'Blue',color:'#8db6e8'},{id:'orange',name:'Orange',color:'#d99762'}].map(t=><button key={t.id} className={theme===t.id?'theme-option selected':'theme-option'} onClick={()=>setTheme(t.id)}><i style={{background:t.color}}/><span>{t.name}</span>{theme===t.id&&<span className="theme-check">Selected</span>}</button>)}</div></section>
<section className="settings-section"><div className="settings-section-title"><UserCircle size={17}/><div><strong>Profile</strong><span>Personal details and picture are saved locally on this device for now.</span></div></div><button className="new-button settings-profile-link" onClick={()=>setActive('Profile')}>Edit profile <ChevronRight size={15}/></button></section>
<section className="settings-section"><div className="settings-section-title"><Layers size={17}/><div><strong>Storage & app status</strong><span>Current app health and where your data lives.</span></div></div><div className="settings-status-grid"><div><small>MEMORIES & ENTRIES</small><strong>{entries.length}</strong></div><div><small>COLLECTIONS</small><strong>{collections.length}</strong></div><div><small>STORAGE</small><strong>On this device</strong></div><div><small>CLOUD SYNC</small><strong>Not active yet</strong></div><div><small>ACCOUNT</small><strong>{authLoading?'Checking…':authUser?'Connected':'Not connected'}</strong></div><div><small>VERSION</small><strong>Solace · 0.1</strong></div></div></section>
<section className="settings-section"><div className="settings-section-title"><Lock size={17}/><div><strong>Privacy</strong><span>Your entries stay in this browser's IndexedDB. Account sign-in does not upload entries.</span></div></div></section>
<section className="settings-section"><div className="settings-section-title"><Link2 size={17}/><div><strong>Backup & restore</strong><span>Download a copy or restore a previous JSON backup into your local archive.</span></div></div><div className="backup-actions"><button className="hero-cta" onClick={()=>{const payload=JSON.stringify({exportedAt:new Date().toISOString(),entries,collections},null,2);const blob=new Blob([payload],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='solace-backup.json';a.click();URL.revokeObjectURL(a.href)}}>Export backup <ChevronRight size={15}/></button><label className="restore-label">Restore backup <input type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());for(const item of (parsed.entries||[]))await saveEntry(item);for(const item of (parsed.collections||[]))await saveCollection(item);await refresh();alert('Backup restored.')}catch{alert('Invalid backup file.')}}}/></label></div></section>
<section className="settings-section"><div className="settings-section-title"><UserCircle size={17}/><div><strong>Account</strong><span>{authLoading?'Checking account…':authUser?authUser.email||'Signed in':'Sign in to connect your profile'}</span></div></div>{authUser?<button className="hero-cta" disabled={authBusy} onClick={()=>void handleSignOut()}>{authBusy?'Working…':'Sign out'} <ChevronRight size={15}/></button>:<button className="new-button" disabled={authBusy} onClick={()=>void handleGoogleSignIn()}>{authBusy?'Connecting…':'Continue with Google'} <ChevronRight size={15}/></button>}{authMessage&&<span className="account-message">{authMessage}</span>}</section></div>}
        {active==='Profile'&&<div className="content inner-page profile-page"><div className="inner-kicker">YOUR SPACE · PROFILE</div><h1>A little about you.</h1><p className="inner-description">Your profile is yours to shape. These details stay on this device for now.</p><section className="profile-editor"><div className="profile-avatar-wrap">{profileAvatar?<img className="profile-avatar" src={profileAvatar} alt="Profile avatar"/>:<div className="profile-avatar placeholder-avatar"><UserCircle size={48}/></div>}<label className="avatar-upload" title="Choose profile picture"><Upload size={14}/><input type="file" accept="image/*" onChange={e=>void handleAvatarFile(e.target.files?.[0])}/></label></div><label className="profile-field">DISPLAY NAME<input value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder={authUser?.displayName||'What should Solace call you?'}/></label><label className="profile-field">ABOUT YOU<textarea rows={3} maxLength={180} value={profileBio} onChange={e=>setProfileBio(e.target.value)} placeholder="A few words, if you feel like it…"/></label>{authUser&&<div className="profile-account-line">Signed in as <strong>{authUser.email}</strong></div>}<div className="profile-actions"><button className="new-button" onClick={saveProfile}>Save profile</button><button className="hero-cta" onClick={()=>{setProfileName('');setProfileBio('');setProfileAvatar('');try{localStorage.removeItem('solace-profile-name');localStorage.removeItem('solace-profile-bio');localStorage.removeItem('solace-profile-avatar')}catch{}}}>Reset profile <RotateCcw size={14}/></button></div>{profileSaved&&<p className="profile-saved">Profile saved on this device.</p>}{authMessage&&<p className="account-message">{authMessage}</p>}</section><button className="account-back-link" onClick={()=>setActive('Settings')}><ArrowLeft size={14}/> Back to settings</button></div>}
      </main>
      {showComposer&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeComposer()}}><form className="composer" onSubmit={createEntry}><div className="composer-top"><div><div className="eyebrow muted">A MOMENT TO KEEP</div><h2>{editingId?'Edit this moment.':'Leave something here.'}</h2></div><button type="button" className="icon-button" onClick={closeComposer}><X size={18}/></button></div><div className="kind-tabs">{(['memory','reflection','experience'] as EntryKind[]).map(k=><button type="button" className={kind===k?'selected':''} onClick={()=>setKind(k)} key={k}>{k}</button>)}</div><input className="composer-title" placeholder="Give this moment a name..." value={title} onChange={e=>setTitle(e.target.value)}/><textarea placeholder="Whatever you'd like to remember..." value={body} onChange={e=>setBody(e.target.value)} rows={5}/>{kind === 'memory' && <label className="privacy-select">Tags <input className="memory-tag-input" placeholder="e.g. family, travel, little joys" value={memoryTags} onChange={e=>setMemoryTags(e.target.value)}/><span className="tag-hint">Separate tags with commas. Up to 12 tags per memory.</span></label>}<label className="privacy-select">Who can access this? <select value={privacy} onChange={e=>setPrivacy(e.target.value as Privacy)}><option value="private">Private — excluded from AI</option><option value="ai-readable">AI-readable — only if AI is enabled</option><option value="shareable">Shareable — only when I choose to share</option></select></label>{collections.length>0&&<label className="privacy-select">Add to a collection<select value={attachCollection} onChange={e=>setAttachCollection(e.target.value)}><option value="">None</option>{collections.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}<div className="composer-footer"><span><Lock size={13}/> Saved on this device</span><button className="new-button" type="submit">Save gently <ChevronRight size={15}/></button></div></form></div>}
    </div>
  )
}
export default App
