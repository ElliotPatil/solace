import { useEffect, useMemo, useState } from 'react'
import { getSkills, saveSkill, deleteSkill, getHobbies, saveHobby, deleteHobby } from '../../db'
import type { Skill, Hobby, SkillCategory, HobbyCategory } from './types'
import MediaUploader from '../../components/media/MediaUploader'
import { Plus, Trash2, Sparkles, Star, Lightbulb } from 'lucide-react'

const skillCategories: SkillCategory[] = ['technology','creative','business','communication','academic','other']
const hobbyCategories: HobbyCategory[] = ['sports','music','creative','learning','entertainment','other']
const stamp = () => new Date().toISOString()

export default function SkillsHobbiesPage() {
  const [skills,setSkills] = useState<Skill[]>([])
  const [hobbies,setHobbies] = useState<Hobby[]>([])
  const [tab,setTab] = useState<'skills'|'hobbies'>('skills')
  const [name,setName] = useState('')
  const [description,setDescription] = useState('')
  const [tagsText,setTagsText] = useState('')
  const [category,setCategory] = useState<string>('technology')
  const [error,setError] = useState('')
  async function refresh() {
    const [s,h] = await Promise.all([getSkills(),getHobbies()])
    setSkills(s); setHobbies(h)
  }
  useEffect(()=>{void refresh()},[])
  useEffect(()=>{setCategory(tab==='skills'?'technology':'sports')},[tab])
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
  async function removeItem(id:string) {
    if(tab==='skills') await deleteSkill(id); else await deleteHobby(id)
    await refresh()
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
      <div className="interest-form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder={tab==='skills'?'e.g. Web development':'e.g. Chess'} maxLength={70}/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{(tab==='skills'?skillCategories:hobbyCategories).map(value=><option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label></div>
      <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} maxLength={280} placeholder="A little about this interest (optional)…"/></label><label>Tags<input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="e.g. creativity, problem-solving, music"/></label>
      <button className="new-button" type="submit" disabled={!name.trim()}>Save {tab==='skills'?'skill':'hobby'} <Plus size={14}/></button>
      {error&&<p className="interest-error">{error}</p>}
    </form>
    <div className="interest-list-heading"><div><span className="eyebrow muted">{tab.toUpperCase()} · {items.length}</span><h2>{tab==='skills'?'Skills you are building':'Hobbies you enjoy'}</h2></div></div>
    {items.length===0?<div className="interest-empty"><Lightbulb size={22}/><strong>Your list starts with one thing.</strong><span>Add something you already know, or something you're curious to explore.</span></div>:<div className="interest-grid">{items.map(item=><article className="interest-card interest-card-media" key={item.id}><div className="interest-card-top"><span>{item.category.replace('_',' ')}</span><button aria-label={'Delete '+item.name} onClick={()=>void removeItem(item.id)}><Trash2 size={14}/></button></div><h3>{item.name}</h3><p>{item.description||'A little part of what makes you, you.'}</p><MediaUploader banner={item.banner} images={item.showcaseImages} onChange={async(banner,showcaseImages)=>{const updated={...item,banner,showcaseImages,updatedAt:stamp()};if(tab==='skills')await saveSkill(updated as Skill);else await saveHobby(updated as Hobby);await refresh()}} title="Visual showcase"/><div className="interest-card-foot">ADDED {new Date(item.createdAt).toLocaleDateString()}</div></article>)}</div>}
    <section className="interest-insights"><div className="interest-insight-title"><Sparkles size={16}/><div><span className="eyebrow muted">EARLY PATTERNS</span><h2>Connections & common ground</h2></div></div>{crossConnections.length>0?<div className="interest-connection-list">{crossConnections.map((connection,index)=><div className="interest-connection" key={connection.skill+'-'+connection.hobby+'-'+index}><strong>{connection.skill} <span>↔</span> {connection.hobby}</strong><p>Shared themes: {connection.tags.join(', ')}</p></div>)}</div>:allTags.length?<p>These themes appear across more than one interest: <strong>{allTags.join(', ')}</strong>. Add matching tags to a skill and a hobby to reveal their direct connection.</p>:<p>Add tags to your skills and hobbies. Solace will surface real overlaps from what you enter — it won't invent strengths or conclusions.</p>}</section>
  </div>
}
