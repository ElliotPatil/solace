import { useEffect, useMemo, useState } from 'react'
import { getSkills, saveSkill, deleteSkill, getHobbies, saveHobby, deleteHobby } from '../../db'
import type { Skill, Hobby, SkillCategory, HobbyCategory } from './types'
import MediaUploader from '../../components/media/MediaUploader'
import CustomSelect from '../../components/ui/CustomSelect'
import { Plus, Sparkles, Star, Lightbulb, Undo2, Redo2 } from 'lucide-react'

const skillCategories: SkillCategory[] = ['technology','creative','business','communication','academic','other']
const hobbyCategories: HobbyCategory[] = ['sports','music','creative','learning','entertainment','other']
const stamp = () => new Date().toISOString()

// Optional starter set: only inserted after the user explicitly chooses it.
// Descriptions stay honest about these being developing/practised skills.
const starterSkills: Array<Pick<Skill,'name'|'description'|'category'|'tags'>> = [
  {name:'Web & app development',description:'Building web apps and progressive web apps, learning by shipping real projects such as Solace and a study command centre.',category:'technology',tags:['react','typescript','vite','pwa','web development']},
  {name:'Frontend development',description:'Working with component-based interfaces, layouts, styling, responsive design, and browser behaviour.',category:'technology',tags:['html','css','javascript','react','frontend']},
  {name:'Debugging & problem-solving',description:'Tracing UI and build issues, testing fixes, reading errors, and improving features through iteration.',category:'technology',tags:['debugging','troubleshooting','problem-solving','testing']},
  {name:'GitHub & deployment workflows',description:'Using GitHub repositories and commits, working on the main branch, and deploying projects with Vercel.',category:'technology',tags:['git','github','vercel','deployment','version control']},
  {name:'AI & machine-learning experimentation',description:'Experimenting with neural networks, image classification, linear regression, and NLP-related programs beyond basic coursework.',category:'technology',tags:['artificial intelligence','machine learning','neural networks','image classification','linear regression','nlp']},
  {name:'UI/UX & product design',description:'Planning app structure, navigation, user flows, feature priorities, and calm, usable interfaces.',category:'creative',tags:['ui','ux','product design','user flows','prototyping']},
  {name:'Visual branding & design',description:'Developing visual identities, app logos, colour systems, and consistent design direction for digital projects.',category:'creative',tags:['branding','visual design','logo direction','design systems']},
  {name:'Business planning & entrepreneurship',description:'Exploring business ideas, product opportunities, positioning, and practical ways to turn useful projects into products.',category:'business',tags:['entrepreneurship','business strategy','product thinking','planning']},
  {name:'YouTube & content creation',description:'Developing channel ideas, content concepts, and a consistent direction for online content projects.',category:'creative',tags:['youtube','content strategy','storytelling','digital media']},
]

export default function SkillsHobbiesPage() {
  const [skills,setSkills] = useState<Skill[]>([])
  const [hobbies,setHobbies] = useState<Hobby[]>([])
  const [tab,setTab] = useState<'skills'|'hobbies'>('skills')
  const [name,setName] = useState('')
  const [description,setDescription] = useState('')
  const [tagsText,setTagsText] = useState('')
  const [category,setCategory] = useState<string>('technology')
  const [error,setError] = useState('')
  const [isSeeding,setIsSeeding] = useState(false)
  const [deletedHistory,setDeletedHistory] = useState<Array<{type:'skills'|'hobbies';item:Skill|Hobby}>>([])
  const [redoHistory,setRedoHistory] = useState<Array<{type:'skills'|'hobbies';item:Skill|Hobby}>>([])
  async function refresh() {
    const [s,h] = await Promise.all([getSkills(),getHobbies()])
    setSkills(s); setHobbies(h)
  }
  useEffect(()=>{void refresh()},[])
  useEffect(()=>{setCategory(tab==='skills'?'technology':'sports')},[tab])
  async function addStarterSkills() {
    if (isSeeding || skills.length > 0) return
    setIsSeeding(true)
    const now = stamp()
    try {
      for (const skill of starterSkills) {
        await saveSkill({
          id: crypto.randomUUID(),
          ...skill,
          showcaseImages: [],
          relatedHobbyIds: [],
          relatedSkillIds: [],
          isPinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
      }
      await refresh()
      setError('')
    } catch {
      setError('Some starter skills could not be saved. Please try again.')
    } finally {
      setIsSeeding(false)
    }
  }
  async function addItem(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!name.trim()) return
    const now=stamp(), id=crypto.randomUUID()
    try {
      if(tab==='skills') {
        await saveSkill({id,name:name.trim(),description:description.trim(),category:category as SkillCategory,showcaseImages:[],tags:tagsText.split(',').map(tag=>tag.trim()).filter(Boolean),relatedHobbyIds:[],relatedSkillIds:[],isPinned:false,archived:false,createdAt:now,updatedAt:now})
      } else {
        await saveHobby({id,name:name.trim(),description:description.trim(),category:category as HobbyCategory,showcaseImages:[],tags:tagsText.split(',').map(tag=>tag.trim()).filter(Boolean),relatedSkillIds:[],isPinned:false,archived:false,createdAt:now,updatedAt:now})
      }
      setName('');setDescription('');setTagsText('');setError('');await refresh()
    } catch {setError('Could not save this item on your device.')}
  }
  async function removeItem(item:Skill|Hobby) {
    const label=tab==='skills'?'skill':'hobby'
    if(!window.confirm('Delete '+label+' "'+item.name+'"?')) return
    if(!window.confirm('Are you absolutely sure? This '+label+' will be removed.')) return
    if(tab==='skills') await deleteSkill(item.id); else await deleteHobby(item.id)
    setDeletedHistory(previous=>[...previous,{type:tab,item}]);setRedoHistory([]);await refresh()
  }
  async function undoDelete() {
    const action=deletedHistory[deletedHistory.length-1];if(!action)return
    if(action.type==='skills')await saveSkill(action.item as Skill);else await saveHobby(action.item as Hobby)
    setDeletedHistory(previous=>previous.slice(0,-1));setRedoHistory(previous=>[...previous,action]);await refresh()
  }
  async function redoDelete() {
    const action=redoHistory[redoHistory.length-1];if(!action)return
    if(action.type==='skills')await deleteSkill(action.item.id);else await deleteHobby(action.item.id)
    setRedoHistory(previous=>previous.slice(0,-1));setDeletedHistory(previous=>[...previous,action]);await refresh()
  }
  const allTags = useMemo(()=> {
    const counts=new Map<string,number>()
    ;[...skills,...hobbies].forEach(item=>item.tags.forEach(tag=>counts.set(tag.toLowerCase(),(counts.get(tag.toLowerCase())||0)+1)))
    return [...counts].filter(([,count])=>count>1).map(([tag])=>tag)
  },[skills,hobbies])
  const crossConnections = useMemo(()=>skills.flatMap(skill=>hobbies.flatMap(hobby=>{
    const shared=skill.tags.filter(tag=>hobby.tags.some(other=>other.toLowerCase()===tag.toLowerCase()))
    return shared.length?[{skill:skill.name,hobby:hobby.name,tags:[...new Set(shared.map(tag=>tag.toLowerCase()))]}]:[]
  })),[skills,hobbies])
  const items = tab==='skills'?skills:hobbies
  return <div className="content inner-page interest-page">
    <div className="inner-kicker">YOUR SPACE · INTERESTS</div>
    <h1>Things you're growing.</h1>
    <p className="inner-description">Keep track of what you're learning, practising, and enjoying. No scores or pressure — just a record of your interests.</p>
    <div className="interest-tabs"><button className={tab==='skills'?'selected':''} onClick={()=>setTab('skills')}><Star size={14}/> Skills <span>{skills.length}</span></button><button className={tab==='hobbies'?'selected':''} onClick={()=>setTab('hobbies')}>Hobbies <span>{hobbies.length}</span></button></div>
    <form className="interest-form" onSubmit={addItem}>
      <div className="interest-form-heading"><Plus size={16}/><strong>Add a {tab==='skills'?'skill':'hobby'}</strong></div>
      <div className="interest-form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder={tab==='skills'?'e.g. Web development':'e.g. Chess'} maxLength={70}/></label><label>Category<CustomSelect value={category} onChange={setCategory} options={(tab==='skills'?skillCategories:hobbyCategories).map(value=>({value,label:value.replace('_',' ')}))} /></label></div>
      <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} maxLength={280} placeholder="A little about this interest (optional)…"/></label><label>Tags<input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="e.g. creativity, problem-solving, music"/></label>
      <button className="new-button" type="submit" disabled={!name.trim()}>Save {tab==='skills'?'skill':'hobby'} <Plus size={14}/></button>
      {error&&<p className="interest-error">{error}</p>}
    </form>
    <div className="interest-list-heading"><div><span className="eyebrow muted">{tab.toUpperCase()} · {items.length}</span><h2>{tab==='skills'?'Skills you are building':'Hobbies you enjoy'}</h2></div><div className="interest-history-actions"><button type="button" onClick={()=>void undoDelete()} disabled={!deletedHistory.length} aria-label="Undo" title="Undo"><Undo2 size={16}/></button><button type="button" onClick={()=>void redoDelete()} disabled={!redoHistory.length} aria-label="Redo" title="Redo"><Redo2 size={16}/></button></div></div>
    {items.length===0?<div className="interest-empty"><Lightbulb size={22}/><strong>{tab==='skills'?'Start with the skills you are already developing.':'Your list starts with one thing.'}</strong><span>{tab==='skills'?'Solace can add a starter set based on the projects and experiments you have worked on. You can edit or remove any item afterwards.':'Add something you enjoy, or something you are curious to explore.'}</span>{tab==='skills'&&<button className="new-button" type="button" onClick={()=>void addStarterSkills()} disabled={isSeeding}>{isSeeding?'Adding skills…':'Add my starter skills'} <Plus size={14}/></button>}</div>:<div className="interest-grid">{items.map(item=><article className="interest-card interest-card-media" key={item.id}><MediaUploader banner={item.banner} images={item.showcaseImages} onChange={async(banner,showcaseImages)=>{const updated={...item,banner,showcaseImages,updatedAt:stamp()};if(tab==='skills')await saveSkill(updated as Skill);else await saveHobby(updated as Hobby);await refresh()}} title="Visual showcase"/><div className="interest-card-content"><div className="interest-card-top"><span>{item.category.replace('_',' ')}</span><button aria-label={'Delete '+item.name} onClick={()=>void removeItem(item)}><Trash2 size={14}/></button></div><h3>{item.name}</h3><p>{item.description||'A little part of what makes you, you.'}</p><div className="interest-card-foot">ADDED {new Date(item.createdAt).toLocaleDateString()}</div></div></article>)}</div>}
    <section className="interest-insights"><div className="interest-insight-title"><Sparkles size={16}/><div><span className="eyebrow muted">EARLY PATTERNS</span><h2>Connections & common ground</h2></div></div>{crossConnections.length>0?<div className="interest-connection-list">{crossConnections.map((connection,index)=><div className="interest-connection" key={connection.skill+'-'+connection.hobby+'-'+index}><strong>{connection.skill} <span>↔</span> {connection.hobby}</strong><p>Shared themes: {connection.tags.join(', ')}</p></div>)}</div>:allTags.length?<p>These themes appear across more than one interest: <strong>{allTags.join(', ')}</strong>. Add matching tags to a skill and a hobby to reveal their direct connection.</p>:<p>Add tags to your skills and hobbies. Solace will surface real overlaps from what you enter — it won't invent strengths or conclusions.</p>}</section>
  </div>
}
