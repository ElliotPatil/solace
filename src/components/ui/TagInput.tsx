import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllTags } from '../../db'

type TagInputProps = {
  value: string
  onChange: (value:string) => void
  placeholder?: string
  className?: string
}
export default function TagInput({value,onChange,placeholder='Add tags…',className}:TagInputProps){
  const [tags,setTags]=useState<string[]>([])
  const [open,setOpen]=useState(false)
  const [active,setActive]=useState(0)
  const root=useRef<HTMLDivElement>(null)
  const current=value.split(',').pop()?.trim().replace(/^#/,'')||''
  useEffect(()=>{let alive=true;getAllTags().then(items=>{if(alive)setTags(items)}).catch(()=>{});return()=>{alive=false}},[])
  useEffect(()=>{
    const close=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)}
    document.addEventListener('pointerdown',close)
    return()=>document.removeEventListener('pointerdown',close)
  },[])
  const suggestions=useMemo(()=>tags.filter(tag=>tag.toLocaleLowerCase().includes(current.toLocaleLowerCase())&&!value.split(',').slice(0,-1).some(existing=>existing.trim().toLocaleLowerCase()===tag.toLocaleLowerCase())).slice(0,7),[tags,current,value])
  function choose(tag:string){
    const parts=value.split(',')
    parts[parts.length-1]=' '+tag
    onChange(parts.join(',').replace(/^\s+/,'')+', ')
    setOpen(false);setActive(0)
  }
  return <div className="tag-input-wrap" ref={root}>
    <input className={className} value={value} placeholder={placeholder} onChange={event=>{onChange(event.target.value);setOpen(true);setActive(0)}} onFocus={()=>setOpen(true)} onKeyDown={event=>{
      if(!open||!suggestions.length)return
      if(event.key==='ArrowDown'){event.preventDefault();setActive(index=>(index+1)%suggestions.length)}
      else if(event.key==='ArrowUp'){event.preventDefault();setActive(index=>(index-1+suggestions.length)%suggestions.length)}
      else if(event.key==='Enter'&&suggestions[active]){event.preventDefault();choose(suggestions[active])}
      else if(event.key==='Escape')setOpen(false)
    }}/>
    {open&&current&&suggestions.length>0&&<div className="tag-suggestions" role="listbox" aria-label="Existing tags">{suggestions.map((tag,index)=><button type="button" role="option" aria-selected={index===active} key={tag} className={index===active?'active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(tag)}><span>#{tag}</span><small>Existing tag</small></button>)}</div>}
  </div>
}
