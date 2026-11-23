import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { ensureUserProfile } from './userProfile'
import { Aperture, BookOpen, Brain, ChevronRight, Compass, Film, FolderHeart, House, Menu, Plus, Search, Settings2, Sparkles, X, Feather, Pencil, Lock, Trash2, Layers, Star, ArrowLeft, Link2, Pin, Tag, UserCircle, Palette, Upload, RotateCcw, Heart, Moon, Sun, CloudMoon, Wind } from 'lucide-react'
import { deleteEntry, getEntries, saveEntry, getCollections, saveCollection, deleteCollection, getDrafts, saveDraft, deleteDraft, getMoodCheckins, saveMoodCheckin, getQuietMoments, saveQuietMoment, type Entry, type EntryKind, type Privacy, type Collection, type Draft, type MoodCheckin, type MoodValue } from './db'

const sections = [
  { id: 'Sanctuary', icon: House }, { id: 'Discover', icon: Compass }, { id: 'Reflect', icon: Feather },
  { id: 'Memories', icon: BookOpen }, { id: 'Experiences', icon: Film }, { id: 'Collections', icon: FolderHeart },
  { id: 'Universe', icon: Aperture }, { id: 'Drafts', icon: BookOpen }, { id: 'AI companion', icon: Sparkles },
]
const copy: Record<string, string> = {
  Sanctuary: 'A place to simply be.', Discover: 'There is always more to understand about yourself.',
  Reflect: 'A little space for whatever is on your mind.', Memories: 'Keep the moments you want to carry with you.',
  Experiences: 'A life is made of things lived, not boxes ticked.', Collections: 'Gather the things that mean something to you.',
  Universe: 'Your life, connected in its own way.', 'AI companion': 'A thoughtful space to explore an idea, when you choose.',
}
const prompts = [
  { category:'Moments', text:'What is something small you want to remember about today?' },
  { category:'Thoughts', text:'What idea has been quietly staying with you lately?' },
  { category:'Places', text:'What place makes you feel most like yourself?' },
  { category:'Growth', text:'What would you tell your younger self about this season of life?' },
  { category:'Curiosity', text:'What are you curious about, just for the joy of it?' },
  { category:'Moments', text:'What is something you noticed recently that you usually overlook?' },
  { category:'People', text:'Who has made an ordinary day feel a little different?' },
  { category:'Thoughts', text:'What opinion or belief have you been reconsidering?' },
  { category:'Growth', text:'What feels easier now than it did a year ago?' },
  { category:'Places', text:'Describe a place you would like to return to, and why.' },
  { category:'People', text:'What is one thing someone taught you without realising it?' },
  { category:'Curiosity', text:'What question would you love to spend an afternoon exploring?' },
  { category:'Growth', text:'What are you learning to give yourself more time for?' },
  { category:'Moments', text:'What tiny detail from this week might you otherwise forget?' },
  { category:'Thoughts', text:'What has been taking up space in your mind lately?' },
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
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [moodCheckins, setMoodCheckins] = useState<MoodCheckin[]>([])
  const [quietMoments, setQuietMoments] = useState<import('./db').QuietMoment[]>([])
  const [selectedMood, setSelectedMood] = useState<MoodValue | ''>('')
  const [moodNote, setMoodNote] = useState('')
  const [quietText, setQuietText] = useState('')
  const [sanctuaryMessage, setSanctuaryMessage] = useState('')
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
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
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [promptDraft, setPromptDraft] = useState('')
  const [promptCategory, setPromptCategory] = useState('All')
  const [activePromptText, setActivePromptText] = useState(() => prompts[(new Date().getDate()+new Date().getMonth())%prompts.length].text)
  const [profileName, setProfileName] = useState(() => { try { return localStorage.getItem('solace-profile-name') || '' } catch { return '' } })
  const [profileBio, setProfileBio] = useState(() => { try { return localStorage.getItem('solace-profile-bio') || '' } catch { return '' } })
  const [profileAvatar, setProfileAvatar] = useState(() => { try { return localStorage.getItem('solace-profile-avatar') || '' } catch { return '' } })
  const [cropSource, setCropSource] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropX, setCropX] = useState(0.5)
  const [cropY, setCropY] = useState(0.5)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('solace-theme') || 'midnight' } catch { return 'midnight' } })
  const [profileSaved, setProfileSaved] = useState(false)
  const [universeFilter, setUniverseFilter] = useState<'all'|'memory'|'reflection'|'experience'>('all')
  const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null)
  const [universeConnectionsOpen, setUniverseConnectionsOpen] = useState(true)
  const themeColors: Record<string,string> = { midnight:'#aeb8c8', gold:'#c8aa68', blue:'#8db6e8', orange:'#d99762' }
  useEffect(() => { document.documentElement.style.setProperty('--accent', themeColors[theme] || themeColors.midnight); try { localStorage.setItem('solace-theme', theme) } catch {} }, [theme])
  function saveProfile() {
    try {
      let avatar = profileAvatar
      if (cropSource) {
        const image = new Image()
        image.onload = () => {
          const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256
          const ctx = canvas.getContext('2d'); if (!ctx) return
          const base = Math.min(image.width, image.height), crop = base / cropZoom
          const maxX = Math.max(0, image.width - crop), maxY = Math.max(0, image.height - crop)
          const sx = maxX * cropX, sy = maxY * cropY
          ctx.drawImage(image, sx, sy, crop, crop, 0, 0, 256, 256)
          avatar = canvas.toDataURL('image/jpeg', .82)
          setProfileAvatar(avatar); setCropSource('')
          localStorage.setItem('solace-profile-avatar', avatar); localStorage.setItem('solace-profile-name', profileName.trim()); localStorage.setItem('solace-profile-bio', profileBio.trim()); setProfileSaved(true); window.setTimeout(() => setProfileSaved(false), 2200)
        }
        image.onerror = () => setAuthMessage('That image could not be processed.')
        image.src = cropSource
        return
      }
      localStorage.setItem('solace-profile-name', profileName.trim()); localStorage.setItem('solace-profile-bio', profileBio.trim()); localStorage.setItem('solace-profile-avatar', avatar); setProfileSaved(true); window.setTimeout(() => setProfileSaved(false), 2200)
    } catch { setAuthMessage('Profile could not be saved on this device.') }
  }
  async function handleAvatarFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setAuthMessage('Choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => { setCropSource(String(reader.result || '')); setCropZoom(1); setCropX(0.5); setCropY(0.5); setCropModalOpen(true); setAuthMessage('Adjust the crop, then save your profile.') }
    reader.readAsDataURL(file)
  }
  async function refresh() {
    try { const [nextEntries,nextCollections,nextDrafts,nextMoods,nextQuiet]=await Promise.all([getEntries(),getCollections(),getDrafts(),getMoodCheckins(),getQuietMoments()]); setEntries(nextEntries); setCollections(nextCollections); setDrafts(nextDrafts); setMoodCheckins(nextMoods); setQuietMoments(nextQuiet) } catch { /* offline storage unavailable */ }
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
  const onThisDay = entries.filter(e => { const d=new Date(e.createdAt); const now=new Date(); return d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()&&d.getFullYear()<now.getFullYear() }).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,2)
  const universePositions = [[12,18],[23,35],[36,15],[48,27],[65,16],[80,27],[17,54],[30,69],[42,48],[59,62],[72,48],[88,66],[8,80],[25,88],[39,82],[53,91],[67,83],[81,91],[93,12],[9,39],[54,10],[71,31],[86,44],[16,68],[34,28],[46,74],[61,40],[77,14],[90,83],[3,57],[29,48],[49,51]]
  const universeEntries = entries.filter(e => universeFilter === 'all' || e.kind === universeFilter)
  const selectedUniverseEntry = entries.find(e => e.id === selectedUniverseId)
  const getConnectionDetails = (entry: Entry) => {
    if (!selectedUniverseEntry || entry.id === selectedUniverseEntry.id) return { score: 0, reason: '' }
    const sharedTags = (entry.tags || []).filter(tag => (selectedUniverseEntry.tags || []).some(selectedTag => selectedTag.toLowerCase() === tag.toLowerCase()))
    const sameCollection = Boolean(entry.collectionId && selectedUniverseEntry.collectionId && entry.collectionId === selectedUniverseEntry.collectionId)
    const collectionName = sameCollection ? collections.find(c => c.id === entry.collectionId)?.name : ''
    const reasons = [...sharedTags.map(tag => '#' + tag), ...(sameCollection ? ['Collection: ' + (collectionName || 'shared collection')] : [])]
    return { score: sharedTags.length * 2 + (sameCollection ? 3 : 0), reason: reasons.join(' · ') }
  }
  const relatedUniverseEntries = selectedUniverseEntry ? entries.filter(e => getConnectionDetails(e).score > 0).sort((a,b) => getConnectionDetails(b).score - getConnectionDetails(a).score || b.createdAt.localeCompare(a.createdAt)) : []
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
    const savedDate = new Date(`${entryDate}T12:00:00`).toISOString()
    await saveEntry({ id: editingId || editingDraftId || crypto.randomUUID(), kind, title: title.trim() || 'Untitled', body: body.trim(), createdAt: savedDate, privacy, collectionId: attachCollection || undefined, pinned: kind === 'memory' ? existing?.pinned || false : undefined, tags })
    if (editingDraftId) await deleteDraft(editingDraftId)
    setTitle(''); setBody(''); setPrivacy('private'); setMemoryTags(''); setAttachCollection(''); setEntryDate(new Date().toISOString().slice(0, 10)); setEditingId(null); setEditingDraftId(null); setShowComposer(false); await refresh()
  }
  function editDraft(draft:Draft) {
    setEditingId(null); setEditingDraftId(draft.id); setKind(draft.kind); setTitle(draft.title); setBody(draft.body)
    setPrivacy(draft.privacy); setMemoryTags((draft.tags || []).join(', ')); setAttachCollection(draft.collectionId || '')
    const localDate = new Date(draft.createdAt); localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
    setEntryDate(localDate.toISOString().slice(0,10)); setShowComposer(true)
  }
  async function storeDraft(event?:FormEvent) {
    event?.preventDefault()
    if (!title.trim() && !body.trim()) return
    const now = new Date().toISOString()
    const tags = kind === 'memory' ? Array.from(new Set(memoryTags.split(',').map(tag=>tag.trim().replace(/^#/, '')).filter(Boolean))).slice(0,12) : undefined
    await saveDraft({ id: editingDraftId || crypto.randomUUID(), kind, title: title.trim(), body: body.trim(), createdAt: new Date(`${entryDate}T12:00:00`).toISOString(), updatedAt: now, privacy, collectionId: attachCollection || undefined, tags })
    setShowComposer(false); setEditingId(null); setEditingDraftId(null); setTitle(''); setBody(''); setPrivacy('private'); setMemoryTags(''); setAttachCollection(''); setEntryDate(new Date().toISOString().slice(0,10)); await refresh()
  }
  async function publishDraft(draft:Draft) {
    await saveEntry({ id:draft.id, kind:draft.kind, title:draft.title || 'Untitled', body:draft.body, createdAt:draft.createdAt, privacy:draft.privacy, collectionId:draft.collectionId, tags:draft.tags })
    await deleteDraft(draft.id); await refresh()
  }
  function editEntry(entry:Entry) {
    const localDate = new Date(entry.createdAt)
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
    setEntryDate(localDate.toISOString().slice(0, 10))
    setEditingId(entry.id); setKind(entry.kind); setTitle(entry.title); setBody(entry.body); setPrivacy(entry.privacy); setMemoryTags((entry.tags || []).join(', ')); setAttachCollection(entry.collectionId || ''); setShowComposer(true)
  }
  function closeComposer() { setShowComposer(false); setEditingId(null); setEditingDraftId(null); setTitle(''); setBody(''); setPrivacy('private'); setMemoryTags(''); setAttachCollection(''); setEntryDate(new Date().toISOString().slice(0, 10)) }
  async function saveMood() { if (!selectedMood) return; await saveMoodCheckin({id:crypto.randomUUID(),mood:selectedMood,note:moodNote.trim()||undefined,createdAt:new Date().toISOString()}); setMoodNote(''); setSelectedMood(''); setSanctuaryMessage('Your check-in has been saved on this device.'); await refresh() }
  async function saveQuietNote() { const text=quietText.trim(); if(!text)return; await saveQuietMoment({id:crypto.randomUUID(),text,createdAt:new Date().toISOString()}); setQuietText(''); setSanctuaryMessage('Your quiet moment has been saved on this device.'); await refresh() }
  async function togglePinned(entry: Entry) { await saveEntry({ ...entry, pinned: !entry.pinned }); await refresh() }
  async function removeEntry(id: string) { await deleteEntry(id); await refresh() }
  async function createCollection(event: FormEvent) {
    event.preventDefault(); if (!collectionName.trim()) return
    await saveCollection({ id: crypto.randomUUID(), name: collectionName.trim(), description: collectionDesc.trim(), createdAt: new Date().toISOString() })
    setCollectionName(''); setCollectionDesc(''); await refresh()
  }
  async function removeCollection(id: string) { await deleteCollection(id); if(selectedCollection===id) setSelectedCollection(null); await refresh() }
  function startPrompt(text: string, entryKind: EntryKind='reflection') { setKind(entryKind); settitleAndPrompt(text); setShowComposer(true) }
  const visiblePrompts = prompts.filter(prompt => promptCategory === 'All' || prompt.category === promptCategory)
  function chooseAnotherPrompt() {
    const choices = visiblePrompts.filter(prompt => prompt.text !== activePromptText)
    const pool = choices.length ? choices : visiblePrompts
    if (pool.length) setActivePromptText(pool[Math.floor(Math.random()*pool.length)].text)
  }
  function changePromptCategory(category:string) {
    setPromptCategory(category)
    const pool = prompts.filter(prompt => category === 'All' || prompt.category === category)
    if (pool.length) setActivePromptText(pool[Math.floor(Math.random()*pool.length)].text)
  }
  function settitleAndPrompt(text: string) { setTitle(''); setBody(text); setPromptDraft(text); }
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const typeIcon = (k: EntryKind) => k === 'experience' ? <Film size={16}/> : k === 'reflection' ? <Feather size={16}/> : <BookOpen size={16}/>
  const entryCard = (entry: Entry) => <article className="entry-card" key={entry.id}><div className="entry-symbol">{typeIcon(entry.kind)}</div><div className="entry-info"><button type="button" className="entry-title entry-title-open" onClick={()=>setSelectedEntryId(entry.id)}>{entry.title}</button><div className="entry-meta">{entry.kind} · {new Date(entry.createdAt).toLocaleDateString()} {entry.privacy==='private'?'· private':''}</div>{entry.body && <p>{entry.body}</p>}{entry.kind === 'memory' && !!entry.tags?.length && <div className="memory-tags">{entry.tags.map(tag => <span className="memory-tag" key={tag}><Tag size={10}/>{tag}</span>)}</div>}</div>{entry.kind === 'memory' && <button type="button" className={`pin-button ${entry.pinned ? 'is-pinned' : ''}`} aria-label={entry.pinned ? 'Unpin memory' : 'Pin memory'} title={entry.pinned ? 'Unpin memory' : 'Pin memory'} onClick={() => void togglePinned(entry)}><Pin size={14}/></button>}<button type="button" className="edit-button" aria-label="Edit entry" onClick={() => editEntry(entry)}><Pencil size={14}/></button><button type="button" className="delete-button" aria-label="Delete entry" onClick={() => void removeEntry(entry.id)}><Trash2 size={14}/></button></article>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><img className="brand-image" src="/icons/solace-192.png" alt="" aria-hidden="true" /></div><span>solace</span></div>
        <div className="side-caption">YOUR SPACE</div><nav>{sections.map(({id,icon:Icon})=><button key={id} className={`nav-item ${active===id?'active':''}`} onClick={()=>{setActive(id);setMenuOpen(false);setSelectedCollection(null)}}><Icon size={17} strokeWidth={1.65}/><span>{id}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="privacy-note"><Lock size={14}/><span>Stored on this device.</span></div><button className="nav-item settings" onClick={()=>setActive('Settings')}><Settings2 size={17}/><span>Settings</span></button><div className="side-foot">A PLACE TO SIMPLY BE</div></div>
      </aside>
      {menuOpen&&<button className="scrim" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
      <main className="main">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button><div className="breadcrumb">SOLACE <span>/</span> {active.toUpperCase()}</div><div className="top-actions"><button className="icon-button" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}><Search size={18}/></button><button className="nav-account-button" onClick={()=>{setActive('Account');setMenuOpen(false)}}>{authLoading?'Account':authUser?'Account':'Sign in'} <UserCircle size={14}/></button><button className="quick-capture-button" onClick={()=>{setEditingId(null);setEditingDraftId(null);setKind('memory');setTitle('');setBody('');setShowComposer(true)}}><Feather size={15}/><span>Quick capture</span></button><button className="new-button" onClick={()=>{setEditingId(null);setEditingDraftId(null);setKind(active==='Reflect'?'reflection':active==='Experiences'?'experience':'memory');setShowComposer(true)}}><Plus size={16}/><span>New entry</span></button></div></header>
        {searchOpen&&<div className="search-panel"><Search size={16}/><input autoFocus placeholder="Search your universe..." value={query} onChange={e=>setQuery(e.target.value)}/><button className="icon-button" onClick={()=>{setSearchOpen(false);setQuery('')}}><X size={16}/></button></div>}

        {active==='Account'&&<div className="content inner-page account-page"><div className="inner-kicker">YOUR SPACE · ACCOUNT</div><h1>{authUser?'Welcome back.':'A space of your own.'}</h1><p className="inner-description">{authUser?'Your Solace account is connected. Your entries still remain on this device.':'Create an account or sign in to connect your profile to Solace. Your entries stay local for now — signing in does not upload them.'}</p><div className="account-page-card"><div className="account-page-icon">{profileAvatar?<img className="account-avatar-thumb" src={profileAvatar} alt="Profile"/>:<UserCircle size={24}/>}</div>{authLoading?<p>Checking your account…</p>:authUser?<><div className="account-page-name">{profileName||authUser.displayName||'Signed in'}</div><div className="account-page-email">{authUser.email}</div><button className="hero-cta" onClick={()=>setActive('Profile')}>Edit profile <ChevronRight size={16}/></button><button className="hero-cta" disabled={authBusy} onClick={()=>void handleSignOut()}>{authBusy?'Signing out…':'Sign out'} <ChevronRight size={16}/></button></>:<><button className="google-signin-button" disabled={authBusy} onClick={()=>void handleGoogleSignIn()}><span className="google-mark">G</span>{authBusy?'Connecting…':'Continue with Google'}</button><p className="account-page-note">Secure sign-in powered by Google and Firebase.</p><button className="hero-cta" onClick={()=>setActive('Profile')}>Set up your profile <ChevronRight size={16}/></button></>}{authMessage&&<div className="account-message" role="status">{authMessage}</div>}</div><button className="account-back-link" onClick={()=>setActive('Sanctuary')}><ArrowLeft size={14}/> Back to your sanctuary</button></div>}
        {active==='Sanctuary'&&<div className="content sanctuary"><section className="hero"><div className="hero-glow"/><div className="hero-stars"/><div className="hero-content"><div className="eyebrow"><span className="eyebrow-dot"/> {date.toUpperCase()}</div><h1>Welcome {profileName.trim() ? <em>{profileName.trim()}.</em> : <em>home.</em>}</h1><p className="hero-subtitle">A quiet corner of the universe, just for you.</p>{(profileAvatar || profileBio.trim())&&<div className="hero-personal-touch">{profileAvatar&&<img src={profileAvatar} alt="" className="hero-profile-avatar"/>}{profileBio.trim()&&<span>{profileBio.trim()}</span>}</div>}<button className="hero-cta" onClick={()=>{setEditingId(null);setShowComposer(true)}}>Leave a little note <ChevronRight size={16}/></button></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-orb"/><div className="hero-footnote">TAKE YOUR TIME <span>✳</span> THERE IS NO RUSH</div></section>
          <section className="sanctuary-checkin"><div className="sanctuary-section-intro"><div className="eyebrow muted"><Heart size={12}/> A MOMENT FOR YOU</div><h2>How are you arriving today?</h2><p>No need to explain it. Pick what feels closest, or skip this entirely.</p></div><div className="mood-options">{([{mood:'Heavy',label:'A little heavy',icon:CloudMoon},{mood:'Low',label:'Low-key',icon:Moon},{mood:'Steady',label:'Steady',icon:Wind},{mood:'Good',label:'Good',icon:Sun},{mood:'Bright',label:'Bright',icon:Sparkles}] as {mood:MoodValue;label:string;icon:any}[]).map(option=>{const Icon=option.icon;return <button key={option.mood} className={'mood-option '+(selectedMood===option.mood?'selected':'')} onClick={()=>setSelectedMood(option.mood)}><Icon size={18}/><span>{option.label}</span></button>})}</div>{selectedMood&&<div className="mood-note-area"><label htmlFor="mood-note">A few words, if you want</label><textarea id="mood-note" rows={2} maxLength={180} value={moodNote} onChange={e=>setMoodNote(e.target.value)} placeholder="Anything you'd like to add…"/><button className="hero-cta" onClick={()=>void saveMood()}>Save check-in <ChevronRight size={14}/></button></div>}<div className="mood-history">{moodCheckins.slice(0,5).map(item=><div className="mood-history-item" key={item.id}><span>{item.mood}</span><time>{new Date(item.createdAt).toLocaleDateString()}</time>{item.note&&<p>{item.note}</p>}</div>)}</div><p className="local-privacy-note"><Lock size={11}/> Check-ins stay on this device. No scores, streaks or reminders.</p></section><section className="quiet-moments"><div className="sanctuary-section-intro"><div className="eyebrow muted"><Moon size={12}/> QUIET MOMENTS</div><h2>Keep a small piece of now.</h2><p>A sound, a pause, a tiny detail. It doesn't have to become a whole story.</p></div><textarea rows={3} maxLength={280} value={quietText} onChange={e=>setQuietText(e.target.value)} placeholder="A small moment I want to keep…"/><div className="quiet-moment-actions"><span>{quietText.length}/280</span><button className="hero-cta" disabled={!quietText.trim()} onClick={()=>void saveQuietNote()}>Save this moment <ChevronRight size={14}/></button></div>{quietMoments.slice(0,4).map(item=><article className="quiet-moment-item" key={item.id}><p>{item.text}</p><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}</section>{sanctuaryMessage&&<p className="sanctuary-feedback" role="status">{sanctuaryMessage}</p>}
          <section className="lower-grid"><div className="section-block"><div className="section-heading"><div><div className="eyebrow muted">A LITTLE ARCHIVE</div><h2>Recently remembered</h2></div><button className="text-link" onClick={()=>setActive('Memories')}>View all <ChevronRight size={14}/></button></div>{recent.length?<div className="entry-list">{recent.map(entryCard)}</div>:<div className="empty-state"><span className="empty-star">✳</span><p>Your story will find its way here.</p><button onClick={()=>setShowComposer(true)}>Save your first memory <ChevronRight size={14}/></button></div>}</div>
          <div className="section-block universe-card"><div className="eyebrow muted">YOUR UNIVERSE</div><h2>{entries.length?entries.length+' moments, and counting.':'Everything is connected.'}</h2><div className="constellation"><span className="constellation-line line-a"/><span className="constellation-line line-b"/>{entries.slice(0,9).map((e,i)=><i key={e.id} className="star" style={{left:(15+(i*31)%75)+'%',top:(12+(i*47)%75)+'%'}}/>)}<div className="constellation-core"><Aperture size={22}/></div></div><button className="text-link" onClick={()=>setActive('Universe')}>Wander through your universe <ChevronRight size={14}/></button></div></section>{onThisDay.length>0&&<section className="on-this-day"><div className="eyebrow muted"><Star size={12}/> FROM ANOTHER DAY</div><h2>This day, before.</h2><p>Something you saved on this date in a previous year.</p>{onThisDay.map(e=><button className="on-this-day-entry" key={e.id} onClick={()=>{setActive(e.kind==='memory'?'Memories':e.kind==='reflection'?'Reflect':'Experiences');setQuery(e.title)}}><span>{e.kind}</span><strong>{e.title}</strong><small>{new Date(e.createdAt).getFullYear()}</small></button>)}</section>}</div>}
        {active==='Memories'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · MEMORIES</div><h1>Keep what matters.</h1><p className="inner-description">A small archive of moments you'd like to carry.</p><button className="new-button page-new" onClick={()=>{setKind('memory');setShowComposer(true)}}><Plus size={16}/> New memory</button><div className="memory-timeline page-entries">{pinnedMemories.length > 0 && <section className="pinned-memories"><div className="pinned-heading"><Pin size={13}/><h2>Pinned memories</h2><span>{pinnedMemories.length}</span></div><div className="entry-list">{pinnedMemories.map(entryCard)}</div></section>}{memoryGroups.length ? memoryGroups.map(group=><section className="memory-day" key={group.label}><div className="memory-day-heading"><span className="memory-day-dot"/><h2>{group.label}</h2><span className="memory-day-count">{group.entries.length} {group.entries.length===1?'moment':'moments'}</span></div><div className="entry-list">{group.entries.map(entryCard)}</div></section>) : pinnedMemories.length === 0 ? <div className="memory-empty"><span className="empty-star">✳</span><p>{query ? 'No memories found for that search.' : 'Some moments are worth keeping.'}</p><span>{query ? 'Try another word or phrase.' : 'Whenever you are ready, leave a little piece of today here.'}</span>{!query&&<button className="hero-cta" onClick={()=>{setKind('memory');setShowComposer(true)}}>Save your first memory <ChevronRight size={14}/></button>}</div> : null}</div></div>}
        {active==='Reflect'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · REFLECT</div><h1>Make room for a thought.</h1><p className="inner-description">No right answer. No need to finish. Just a little room to notice.</p><section className="reflection-studio"><div className="reflection-studio-heading"><div><div className="eyebrow muted">A THOUGHT TO SIT WITH</div><span>Choose a direction, or let a thought find you.</span></div><button className="prompt-another" onClick={chooseAnotherPrompt}><RotateCcw size={13}/> Another thought</button></div><div className="prompt-categories">{['All','Moments','Thoughts','People','Places','Growth','Curiosity'].map(category=><button key={category} className={promptCategory===category?'active':''} onClick={()=>changePromptCategory(category)}>{category}</button>)}</div><article className="reflect-prompt reflection-featured"><span className="prompt-category-label">{prompts.find(p=>p.text===activePromptText)?.category||'A THOUGHT'}</span><p>{activePromptText}</p><button className="hero-cta" onClick={()=>startPrompt(activePromptText)}>Write about this <ChevronRight size={15}/></button></article><div className="prompt-library"><div className="eyebrow muted">A FEW MORE DOORS TO OPEN</div><div className="prompt-library-grid">{visiblePrompts.filter(p=>p.text!==activePromptText).slice(0,6).map(prompt=><button className="prompt-library-card" key={prompt.text} onClick={()=>setActivePromptText(prompt.text)}><span>{prompt.category}</span><strong>{prompt.text}</strong><small>Choose this thought <ChevronRight size={12}/></small></button>)}</div></div></section><div className="section-heading" style={{marginTop:45}}><div><div className="eyebrow muted">YOUR REFLECTIONS</div><h2>Things on your mind</h2></div></div><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='reflection').map(entryCard)}</div></div>}
        {active==='Experiences'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · EXPERIENCES</div><h1>Life, as it happens.</h1><p className="inner-description">Save the trips, firsts, ordinary days, and stories you want to remember.</p><button className="new-button page-new" onClick={()=>{setKind('experience');setShowComposer(true)}}><Plus size={16}/> Capture experience</button><div className="entry-list page-entries">{filtered.filter(e=>e.kind==='experience').map(entryCard)}</div></div>}
        {active==='Discover'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · DISCOVER</div><h1>Follow what fascinates you.</h1><p className="inner-description">Gentle invitations to explore ideas, places and questions. Nothing to complete.</p><div className="discover-grid">{discoveries.map((d,i)=><article className="discover-card" key={d.title}><div className="eyebrow muted">0{i+1} · OPEN ENDED</div><h2>{d.title}</h2><p>{d.body}</p><button className="hero-cta" onClick={()=>startPrompt(d.prompt)}>Explore this <ChevronRight size={15}/></button></article>)}</div></div>}
        {active==='Collections'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · COLLECTIONS</div><h1>Gather your own constellations.</h1><p className="inner-description">Loose collections for things that belong together, for whatever reason you decide.</p><form className="collection-form" onSubmit={createCollection}><input placeholder="Collection name" value={collectionName} onChange={e=>setCollectionName(e.target.value)}/><input placeholder="A note about it (optional)" value={collectionDesc} onChange={e=>setCollectionDesc(e.target.value)}/><button className="new-button" type="submit"><Plus size={15}/> Create collection</button></form>{selectedCollection? <><button className="text-link" onClick={()=>setSelectedCollection(null)}><ArrowLeft size={14}/> All collections</button><h2>{collections.find(c=>c.id===selectedCollection)?.name}</h2><p className="entry-meta">{collections.find(c=>c.id===selectedCollection)?.description}</p><div className="entry-list page-entries">{entries.filter(e=>e.collectionId===selectedCollection).map(entryCard)}</div></>:<div className="collections-grid">{collections.map(c=><article className="collection-card" key={c.id}><button className="delete-button" onClick={()=>void removeCollection(c.id)} aria-label="Delete collection"><Trash2 size={14}/></button><FolderHeart size={20}/><h2>{c.name}</h2><p>{c.description||'A collection of things that feel connected.'}</p><div className="entry-meta">{entries.filter(e=>e.collectionId===c.id).length} items</div><button className="hero-cta" onClick={()=>setSelectedCollection(c.id)}>Open collection <ChevronRight size={15}/></button></article>)}</div>}</div>}
        {active==='Universe'&&<div className="content inner-page universe-page"><div className="inner-kicker">YOUR SPACE · UNIVERSE</div><h1>Your life, in little stars.</h1><p className="inner-description">A quiet constellation made from things you've saved. Tap a star to pause with that moment.</p><div className="universe-toolbar"><div className="universe-count"><strong>{entries.length}</strong><span>moments kept</span></div><div className="universe-filters">{(['all','memory','reflection','experience'] as const).map(f=><button key={f} className={universeFilter===f?'active':''} onClick={()=>setUniverseFilter(f)}>{f==='all'?'All':f==='memory'?'Memories':f==='reflection'?'Reflections':'Experiences'}</button>)}</div></div><div className="universe-map enhanced-map"><div className="map-vignette"/><div className="map-starscape"/><svg className="universe-links" viewBox="0 0 100 100" preserveAspectRatio="none">{selectedUniverseEntry&&relatedUniverseEntries.map(e=>{const a=universePositions[entries.indexOf(selectedUniverseEntry)%universePositions.length];const b=universePositions[entries.indexOf(e)%universePositions.length];const strength=getConnectionDetails(e).score;return <line key={e.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={Math.min(1.8,.55+strength*.16)} opacity={Math.min(.9,.35+strength*.12)}/>})}</svg>{universeEntries.slice(0,32).map(e=>{const i=entries.indexOf(e);const pos=universePositions[i%universePositions.length];const activeStar=selectedUniverseId===e.id;return <button title={e.title} aria-label={'Open '+e.title} key={e.id} className={'universe-star '+e.kind+' '+(activeStar?'chosen':'')} style={{left:pos[0]+'%',top:pos[1]+'%'}} onClick={()=>setSelectedUniverseId(activeStar?null:e.id)}><span/></button>})}<div className="universe-center"><Aperture size={25}/><span>solace</span></div><div className="universe-map-caption">A COLLECTION OF MOMENTS</div></div>{selectedUniverseEntry&&<section className="universe-detail"><div className="universe-detail-type">{selectedUniverseEntry.kind.toUpperCase()} · {new Date(selectedUniverseEntry.createdAt).toLocaleDateString()}</div><h2>{selectedUniverseEntry.title}</h2><p>{selectedUniverseEntry.body||'A moment saved without words.'}</p>{(selectedUniverseEntry.tags||[]).length>0&&<div className="memory-tags">{selectedUniverseEntry.tags!.map(t=><span className="memory-tag" key={t}><Tag size={10}/>{t}</span>)}</div>}<div className="universe-detail-actions"><button className="hero-cta" onClick={()=>editEntry(selectedUniverseEntry)}>Open moment <ChevronRight size={14}/></button><button className="text-link" onClick={()=>setSelectedUniverseId(null)}>Clear selection</button></div>{relatedUniverseEntries.length>0&&<div className="universe-related"><button className="universe-related-heading" onClick={()=>setUniverseConnectionsOpen(v=>!v)}><span>CONNECTED MOMENTS · {relatedUniverseEntries.length}</span><small>{universeConnectionsOpen?'Hide connections':'Explore connections'} <ChevronRight size={12}/></small></button>{universeConnectionsOpen&&<div className="universe-connection-list">{relatedUniverseEntries.slice(0,6).map(e=><button className="universe-connection-card" key={e.id} onClick={()=>setSelectedUniverseId(e.id)}><strong>{e.title||'Untitled moment'}</strong><small>{getConnectionDetails(e).reason}</small><span>{e.kind} · {new Date(e.createdAt).toLocaleDateString()}</span></button>)}</div>}</div>}</section>}{universeEntries.length===0?<div className="universe-empty"><Aperture size={24}/><h2>Your universe is still quiet.</h2><p>Save a memory, reflection, or experience to see it appear here.</p><button className="hero-cta" onClick={()=>setShowComposer(true)}>Create your first moment <ChevronRight size={14}/></button></div>:<div className="universe-legend"><span><i className="memory-dot"/> Memories</span><span><i className="reflection-dot"/> Reflections</span><span><i className="experience-dot"/> Experiences</span><small>Connections appear when tags or collections overlap.</small></div>}</div>}
        {active==='Drafts'&&<div className="content inner-page drafts-page"><div className="inner-kicker">YOUR SPACE · DRAFTS</div><h1>Thoughts, unfinished.</h1><p className="inner-description">A quiet place for things you started and might return to.</p><button className="new-button page-new" onClick={()=>{setEditingId(null);setEditingDraftId(null);setKind('memory');setTitle('');setBody('');setShowComposer(true)}}><Plus size={15}/> Quick capture</button>{drafts.length===0?<div className="memory-empty"><span className="empty-star">✳</span><p>Nothing waiting here.</p><span>Save an unfinished thought as a draft, and it will stay on this device.</span></div>:<div className="draft-list">{drafts.map(d=><article className="draft-card" key={d.id}><div className="draft-card-top"><span>{d.kind} · Edited {new Date(d.updatedAt).toLocaleDateString()}</span><button className="delete-button" aria-label="Delete draft" onClick={()=>void (async()=>{await deleteDraft(d.id);await refresh()})()}><Trash2 size={14}/></button></div><h2>{d.title||'Untitled thought'}</h2><p>{d.body||'No words yet.'}</p><div className="draft-actions"><button className="hero-cta" onClick={()=>editDraft(d)}>Continue writing <ChevronRight size={14}/></button><button className="text-link" onClick={()=>void publishDraft(d)}>Publish</button></div></article>)}</div>}</div>}
        {active==='AI companion'&&<div className="content inner-page"><div className="inner-kicker">YOUR SPACE · OPTIONAL AI</div><h1>Thoughtful, not intrusive.</h1><p className="inner-description">The companion is not connected yet. When it is, it'll be opt-in, and private entries will remain excluded by design.</p><div className="coming-soon"><Lock size={17}/><span>AI is not active. No entries are sent anywhere.</span></div></div>}
        {active==='Settings'&&<div className="content inner-page settings-page"><div className="inner-kicker">YOUR SPACE · SETTINGS</div><h1>Make Solace yours.</h1><p className="inner-description">Quiet controls for the way your space looks, runs, and keeps your data.</p>
<section className="settings-section"><div className="settings-section-title"><Palette size={17}/><div><strong>Appearance</strong><span>Choose an accent. The dark canvas stays dark.</span></div></div><div className="theme-options">{[{id:'midnight',name:'Midnight',color:'#aeb8c8'},{id:'gold',name:'Gold',color:'#c8aa68'},{id:'blue',name:'Blue',color:'#8db6e8'},{id:'orange',name:'Orange',color:'#d99762'}].map(t=><button key={t.id} className={theme===t.id?'theme-option selected':'theme-option'} onClick={()=>setTheme(t.id)}><i style={{background:t.color}}/><span>{t.name}</span>{theme===t.id&&<span className="theme-check">Selected</span>}</button>)}</div></section>
<section className="settings-section"><div className="settings-section-title"><UserCircle size={17}/><div><strong>Profile</strong><span>Personal details and picture are saved locally on this device for now.</span></div></div><button className="new-button settings-profile-link" onClick={()=>setActive('Profile')}>Edit profile <ChevronRight size={15}/></button></section>
<section className="settings-section"><div className="settings-section-title"><Layers size={17}/><div><strong>Storage & app status</strong><span>Current app health and where your data lives.</span></div></div><div className="settings-status-grid"><div><small>MEMORIES & ENTRIES</small><strong>{entries.length}</strong></div><div><small>COLLECTIONS</small><strong>{collections.length}</strong></div><div><small>STORAGE</small><strong>On this device</strong></div><div><small>CLOUD SYNC</small><strong>Not active yet</strong></div><div><small>ACCOUNT</small><strong>{authLoading?'Checking…':authUser?'Connected':'Not connected'}</strong></div><div><small>VERSION</small><strong>Solace · 0.1</strong></div></div></section>
<section className="settings-section"><div className="settings-section-title"><Lock size={17}/><div><strong>Privacy</strong><span>Your entries stay in this browser's IndexedDB. Account sign-in does not upload entries.</span></div></div></section>
<section className="settings-section"><div className="settings-section-title"><Link2 size={17}/><div><strong>Backup & restore</strong><span>Download a copy or restore a previous JSON backup into your local archive.</span></div></div><div className="backup-actions"><button className="hero-cta" onClick={()=>{const payload=JSON.stringify({exportedAt:new Date().toISOString(),entries,collections,drafts,moodCheckins,quietMoments},null,2);const blob=new Blob([payload],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='solace-backup.json';a.click();URL.revokeObjectURL(a.href)}}>Export backup <ChevronRight size={15}/></button><label className="restore-label">Restore backup <input type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());for(const item of (parsed.entries||[]))await saveEntry(item);for(const item of (parsed.collections||[]))await saveCollection(item);for(const item of (parsed.drafts||[]))await saveDraft(item);for(const item of (parsed.moodCheckins||[]))await saveMoodCheckin(item);for(const item of (parsed.quietMoments||[]))await saveQuietMoment(item);await refresh();alert('Backup restored.')}catch{alert('Invalid backup file.')}}}/></label></div></section>
<section className="settings-section"><div className="settings-section-title"><UserCircle size={17}/><div><strong>Account</strong><span>{authLoading?'Checking account…':authUser?authUser.email||'Signed in':'Sign in to connect your profile'}</span></div></div>{authUser?<button className="hero-cta" disabled={authBusy} onClick={()=>void handleSignOut()}>{authBusy?'Working…':'Sign out'} <ChevronRight size={15}/></button>:<button className="new-button" disabled={authBusy} onClick={()=>void handleGoogleSignIn()}>{authBusy?'Connecting…':'Continue with Google'} <ChevronRight size={15}/></button>}{authMessage&&<span className="account-message">{authMessage}</span>}</section></div>}
        {active==='Profile'&&<div className="content inner-page profile-page"><div className="inner-kicker">YOUR SPACE · PROFILE</div><h1>A little about you.</h1><p className="inner-description">Your profile is yours to shape. These details stay on this device for now.</p><section className="profile-editor"><div className="profile-avatar-wrap">{cropSource?<div className="profile-avatar crop-preview"><img src={cropSource} alt="Crop preview" style={{objectPosition:cropX*100+'% '+cropY*100+'%',transform:'scale('+cropZoom+')'}}/></div>:profileAvatar?<img className="profile-avatar" src={profileAvatar} alt="Profile avatar"/>:<div className="profile-avatar placeholder-avatar"><UserCircle size={48}/></div>}<label className="avatar-upload" title="Choose profile picture"><Upload size={14}/><input type="file" accept="image/*" onChange={e=>void handleAvatarFile(e.target.files?.[0])}/></label></div>{cropSource&&<div className="avatar-crop-controls"><label>ZOOM <input type="range" min="1" max="3" step=".05" value={cropZoom} onChange={e=>setCropZoom(Number(e.target.value))}/></label><label>HORIZONTAL <input type="range" min="0" max="1" step=".01" value={cropX} onChange={e=>setCropX(Number(e.target.value))}/></label><label>VERTICAL <input type="range" min="0" max="1" step=".01" value={cropY} onChange={e=>setCropY(Number(e.target.value))}/></label><button className="text-link" onClick={()=>setCropSource("")}>Cancel crop</button></div>}<label className="profile-field">DISPLAY NAME<input value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder={authUser?.displayName||'What should Solace call you?'}/></label><label className="profile-field">ABOUT YOU<textarea rows={3} maxLength={180} value={profileBio} onChange={e=>setProfileBio(e.target.value)} placeholder="A few words, if you feel like it…"/></label>{authUser&&<div className="profile-account-line">Signed in as <strong>{authUser.email}</strong></div>}<div className="profile-actions"><button className="new-button" onClick={saveProfile}>Save profile</button><button className="hero-cta" onClick={()=>{setProfileName('');setProfileBio('');setProfileAvatar('');setCropSource('');setCropModalOpen(false);try{localStorage.removeItem('solace-profile-name');localStorage.removeItem('solace-profile-bio');localStorage.removeItem('solace-profile-avatar')}catch{}}}>Reset profile <RotateCcw size={14}/></button></div>{profileSaved&&<p className="profile-saved">Profile saved on this device.</p>}{authMessage&&<p className="account-message">{authMessage}</p>}</section><button className="account-back-link" onClick={()=>setActive('Settings')}><ArrowLeft size={14}/> Back to settings</button></div>}
      </main>
      {selectedEntryId&&entries.find(e=>e.id===selectedEntryId)&&(()=>{const entry=entries.find(e=>e.id===selectedEntryId)!;return <div className="modal-backdrop memory-detail-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedEntryId(null)}}><article className="memory-detail-modal" role="dialog" aria-modal="true" aria-label={entry.title}><div className="memory-detail-top"><span className="eyebrow muted">{entry.kind.toUpperCase()} · A MOMENT KEPT</span><button type="button" className="icon-button" aria-label="Close memory" onClick={()=>setSelectedEntryId(null)}><X size={18}/></button></div><div className="memory-detail-date">{new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(entry.createdAt))}</div><h2>{entry.title}</h2><div className="memory-detail-rule"/><p className="memory-detail-body">{entry.body||'A moment saved without words.'}</p>{!!entry.tags?.length&&<div className="memory-tags">{entry.tags.map(tag=><span className="memory-tag" key={tag}><Tag size={10}/>{tag}</span>)}</div>}<div className="memory-detail-footer"><span><Lock size={12}/> {entry.privacy==='private'?'Private · on this device':entry.privacy}</span><div><button className="text-link" onClick={()=>{setSelectedEntryId(null);editEntry(entry)}}><Pencil size={13}/> Edit memory</button><button className="text-link" onClick={()=>{void removeEntry(entry.id);setSelectedEntryId(null)}}><Trash2 size={13}/> Delete</button></div></div></article></div>})()}
      {showComposer&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeComposer()}}><form className="composer" onSubmit={createEntry}><div className="composer-top"><div><div className="eyebrow muted">A MOMENT TO KEEP</div><h2>{editingId?'Edit this moment.':editingDraftId?'Continue this thought.':'Capture a thought.'}</h2></div><button type="button" className="icon-button" onClick={closeComposer}><X size={18}/></button></div><div className="kind-tabs">{(['memory','reflection','experience'] as EntryKind[]).map(k=><button type="button" className={kind===k?'selected':''} onClick={()=>setKind(k)} key={k}>{k}</button>)}</div><input className="composer-title" placeholder="Give this moment a name..." value={title} onChange={e=>setTitle(e.target.value)}/><label className="privacy-select">Date<input type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)}/></label><textarea placeholder="Whatever you'd like to remember..." value={body} onChange={e=>setBody(e.target.value)} rows={5}/>{kind === 'memory' && <label className="privacy-select">Tags <input className="memory-tag-input" placeholder="e.g. family, travel, little joys" value={memoryTags} onChange={e=>setMemoryTags(e.target.value)}/><span className="tag-hint">Separate tags with commas. Up to 12 tags per memory.</span></label>}<label className="privacy-select">Who can access this? <select value={privacy} onChange={e=>setPrivacy(e.target.value as Privacy)}><option value="private">Private — excluded from AI</option><option value="ai-readable">AI-readable — only if AI is enabled</option><option value="shareable">Shareable — only when I choose to share</option></select></label>{collections.length>0&&<label className="privacy-select">Add to a collection<select value={attachCollection} onChange={e=>setAttachCollection(e.target.value)}><option value="">None</option>{collections.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}<div className="composer-footer"><span><Lock size={13}/> Stays on this device</span><div className="composer-save-actions"><button className="hero-cta" type="button" onClick={()=>void storeDraft()}>Save draft</button><button className="new-button" type="submit">{editingDraftId?'Publish thought':'Save gently'} <ChevronRight size={15}/></button></div></div></form></div>}
    </div>
  )
}
export default App
