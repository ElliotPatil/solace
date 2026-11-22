import { useEffect, useMemo, useState } from 'react'
import { Aperture, BookOpen, Brain, ChevronRight, Compass, Film, FolderHeart, House, Menu, Plus, Search, Settings2, Sparkles, X, Feather, Lock, Trash2 } from 'lucide-react'
import { deleteEntry, getEntries, saveEntry, type Entry, type EntryKind, type Privacy } from './db'

const sections = [
  { id: 'Sanctuary', icon: House },
  { id: 'Discover', icon: Compass },
  { id: 'Reflect', icon: Feather },
  { id: 'Memories', icon: BookOpen },
  { id: 'Experiences', icon: Film },
  { id: 'Collections', icon: FolderHeart },
  { id: 'Universe', icon: Aperture },
  { id: 'AI companion', icon: Sparkles },
]

const copy: Record<string, string> = {
  Sanctuary: 'A place to simply be.',
  Discover: 'There is always more to understand about yourself.',
  Reflect: 'A little space for whatever is on your mind.',
  Memories: 'Keep the moments you want to carry with you.',
  Experiences: 'A life is made of things lived, not boxes ticked.',
  Collections: 'Gather the things that mean something to you.',
  Universe: 'Your life, connected in its own way.',
  'AI companion': 'A thoughtful space to explore an idea, when you choose.',
}

function App() {
  const [active, setActive] = useState('Sanctuary')
  const [entries, setEntries] = useState<Entry[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [kind, setKind] = useState<EntryKind>('memory')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('private')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  async function refresh() {
    try { setEntries(await getEntries()) } catch { /* IndexedDB may be unavailable in private browsing */ }
  }

  useEffect(() => { void refresh() }, [])

  const filtered = useMemo(() => entries.filter(e => (e.title + ' ' + e.body).toLowerCase().includes(query.toLowerCase())), [entries, query])
  const recent = entries.slice(0, 3)

  async function createEntry(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() && !body.trim()) return
    await saveEntry({ id: crypto.randomUUID(), kind, title: title.trim() || 'Untitled', body: body.trim(), createdAt: new Date().toISOString(), privacy })
    setTitle(''); setBody(''); setPrivacy('private'); setShowComposer(false); await refresh()
  }

  async function removeEntry(id: string) {
    await deleteEntry(id)
    await refresh()
  }

  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Aperture size={19} strokeWidth={1.4}/></div><span>solace</span></div>
        <div className="side-caption">YOUR SPACE</div>
        <nav>
          {sections.map(({ id, icon: Icon }) => (
            <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => { setActive(id); setMenuOpen(false) }}>
              <Icon size={17} strokeWidth={1.65}/><span>{id}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><Lock size={14}/><span>Your space is yours.</span></div>
          <button className="nav-item settings" onClick={() => setActive('Settings')}><Settings2 size={17}/><span>Settings</span></button>
          <div className="side-foot">A PLACE TO SIMPLY BE</div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={19}/></button>
          <div className="breadcrumb">SOLACE <span>/</span> {active.toUpperCase()}</div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search your entries" onClick={() => setSearchOpen(v => !v)}><Search size={18}/></button>
            <button className="new-button" onClick={() => setShowComposer(true)}><Plus size={16}/> <span>New entry</span></button>
          </div>
        </header>

        {searchOpen && <div className="search-panel"><Search size={16}/><input autoFocus placeholder="Search your universe..." value={query} onChange={e => setQuery(e.target.value)}/><button className="icon-button" onClick={() => { setSearchOpen(false); setQuery('') }}><X size={16}/></button></div>}

        {active === 'Sanctuary' ? (
          <div className="content sanctuary">
            <section className="hero">
              <div className="hero-glow"/>
              <div className="hero-stars"/>
              <div className="hero-content">
                <div className="eyebrow"><span className="eyebrow-dot"/> {date.toUpperCase()}</div>
                <h1>Welcome <em>home.</em></h1>
                <p className="hero-subtitle">A quiet corner of the universe, just for you.</p>
                <button className="hero-cta" onClick={() => setShowComposer(true)}>Leave a little note <ChevronRight size={16}/></button>
              </div>
              <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-orb"/>
              <div className="hero-footnote">TAKE YOUR TIME <span>✳</span> THERE IS NO RUSH</div>
            </section>

            <section className="lower-grid">
              <div className="section-block">
                <div className="section-heading"><div><div className="eyebrow muted">A LITTLE ARCHIVE</div><h2>Recently remembered</h2></div><button className="text-link" onClick={() => setActive('Memories')}>View all <ChevronRight size={14}/></button></div>
                {recent.length ? <div className="entry-list">{recent.map(entry => <article className="entry-card" key={entry.id}><div className="entry-symbol"><BookOpen size={17}/></div><div className="entry-info"><div className="entry-title">{entry.title}</div><div className="entry-meta">{entry.kind} · {new Date(entry.createdAt).toLocaleDateString()}</div>{entry.body && <p>{entry.body}</p>}</div><button className="delete-button" aria-label="Delete entry" onClick={() => void removeEntry(entry.id)}><Trash2 size={14}/></button></article>)}</div> : <div className="empty-state"><span className="empty-star">✳</span><p>Your story will find its way here.</p><button onClick={() => setShowComposer(true)}>Save your first memory <ChevronRight size={14}/></button></div>}
              </div>
              <div className="section-block universe-card">
                <div className="eyebrow muted">YOUR UNIVERSE</div><h2>Everything is connected.</h2>
                <div className="constellation"><span className="constellation-line line-a"/><span className="constellation-line line-b"/><i className="star s1"/><i className="star s2"/><i className="star s3"/><i className="star s4"/><i className="star s5"/><i className="star s6"/><div className="constellation-core"><Aperture size={22}/></div></div>
                <button className="text-link" onClick={() => setActive('Universe')}>Wander through your universe <ChevronRight size={14}/></button>
              </div>
            </section>
          </div>
        ) : (
          <div className="content inner-page">
            <div className="inner-kicker">YOUR SPACE <span>·</span> {active.toUpperCase()}</div>
            <h1>{active === 'Settings' ? 'Make it yours.' : active === 'AI companion' ? 'A companion, when you need one.' : copy[active] ? copy[active].split('.')[0] + '.' : active}</h1>
            <p className="inner-description">{active === 'Settings' ? 'Your preferences and privacy controls will live here.' : copy[active]}</p>
            {active === 'Memories' || active === 'Reflect' || active === 'Experiences' ? <><button className="new-button page-new" onClick={() => { setKind(active === 'Reflect' ? 'reflection' : active === 'Experiences' ? 'experience' : 'memory'); setShowComposer(true) }}><Plus size={16}/> New {active === 'Reflect' ? 'reflection' : active === 'Experiences' ? 'experience' : 'memory'}</button><div className="entry-list page-entries">{filtered.filter(e => active === 'Memories' ? e.kind === 'memory' : active === 'Reflect' ? e.kind === 'reflection' : e.kind === 'experience').map(entry => <article className="entry-card" key={entry.id}><div className="entry-symbol"><BookOpen size={17}/></div><div className="entry-info"><div className="entry-title">{entry.title}</div><div className="entry-meta">{entry.kind} · {new Date(entry.createdAt).toLocaleString()}</div><p>{entry.body}</p></div><button className="delete-button" onClick={() => void removeEntry(entry.id)}><Trash2 size={14}/></button></article>)}</div></> : <div className="coming-soon"><Sparkles size={19}/><span>This part of your universe is still taking shape.</span></div>}
          </div>
        )}
      </main>

      {showComposer && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowComposer(false) }}><form className="composer" onSubmit={createEntry}><div className="composer-top"><div><div className="eyebrow muted">A MOMENT TO KEEP</div><h2>Leave something here.</h2></div><button type="button" className="icon-button" onClick={() => setShowComposer(false)}><X size={18}/></button></div><div className="kind-tabs">{(['memory','reflection','experience'] as EntryKind[]).map(k => <button type="button" className={kind === k ? 'selected' : ''} onClick={() => setKind(k)} key={k}>{k}</button>)}</div><input className="composer-title" placeholder="Give this moment a name..." value={title} onChange={e => setTitle(e.target.value)}/><textarea placeholder="Whatever you'd like to remember..." value={body} onChange={e => setBody(e.target.value)} rows={5}/><label className="privacy-select">Who can access this? <select value={privacy} onChange={e => setPrivacy(e.target.value as Privacy)}><option value="private">Private — excluded from AI</option><option value="ai-readable">AI-readable — only if AI is enabled</option><option value="shareable">Shareable — only when I choose to share</option></select></label><div className="composer-footer"><span><Lock size={13}/> Saved on this device</span><button className="new-button" type="submit">Save gently <ChevronRight size={15}/></button></div></form></div>}
    </div>
  )
}

export default App