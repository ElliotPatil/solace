import { useEffect, useRef, useState } from 'react'
import { getMediaAsset, saveMediaAsset, deleteMediaAsset } from '../../db'
import type { MediaAsset } from '../../features/whats-up/types'
import type { MediaAssetReference } from '../../features/skills-hobbies/types'
import { Plus, MoreHorizontal, ArrowRight, Trash2 } from 'lucide-react'

type MediaUploaderProps = {
  banner?: MediaAssetReference
  images: MediaAssetReference[]
  onChange: (banner: MediaAssetReference | undefined, images: MediaAssetReference[]) => void
  onDeleteItem?: () => void
  title?: string
}
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif']
function reference(asset: MediaAsset): MediaAssetReference {
  return { id: asset.id, mimeType: asset.mimeType, fileName: asset.fileName, size: asset.size }
}
export default function MediaUploader({ banner, onChange, onDeleteItem }: MediaUploaderProps) {
  const [url,setUrl]=useState('')
  const [error,setError]=useState('')
  const [menuOpen,setMenuOpen]=useState(false)
  const inputRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{
    let disposed=false
    if(!banner){setUrl('');return}
    getMediaAsset(banner.id).then(asset=>{
      if(disposed)return
      if(asset?.blob)setUrl(URL.createObjectURL(asset.blob))
    })
    return ()=>{disposed=true}
  },[banner?.id])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url])
  async function chooseBanner(file?:File){
    if(!file)return
    setError('')
    if(!ALLOWED.includes(file.type)){setError('Choose a JPG, PNG, WEBP, or GIF image.');return}
    if(file.size>MAX_IMAGE_SIZE){setError('Images must be 8 MB or smaller.');return}
    const id=crypto.randomUUID(),now=new Date().toISOString()
    const asset:MediaAsset={id,blob:file,mimeType:file.type,fileName:file.name,size:file.size,createdAt:now,updatedAt:now}
    try{
      await saveMediaAsset(asset)
      const previous=banner
      onChange(reference(asset),[])
      if(previous)await deleteMediaAsset(previous.id)
    }catch{setError('Could not save the original image locally.')}
  }
  async function removeBanner(){
    if(!banner)return
    try{await deleteMediaAsset(banner.id);onChange(undefined,[]);setMenuOpen(false)}
    catch{setError('Could not remove this banner.')}
  }
  return <section className="media-uploader">
    <div className="media-banner-slot">
      {url&&<div className="media-preview media-banner"><img src={url} alt="Skill or hobby banner"/></div>}
      {!banner&&<button type="button" className="media-banner-add" onClick={()=>inputRef.current?.click()} aria-label="Add banner"><Plus size={17}/></button>}
      <input ref={inputRef} className="media-banner-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{void chooseBanner(e.target.files?.[0]);e.currentTarget.value=''}}/>
      <div className="interest-card-menu-wrap">
        <button type="button" className="interest-card-menu-trigger" aria-label="More actions" onClick={()=>setMenuOpen(value=>!value)}><MoreHorizontal size={19}/></button>
        {menuOpen&&<div className="interest-card-menu">
          <button type="button" onClick={()=>{setMenuOpen(false);inputRef.current?.click()}}><ArrowRight size={14}/>{banner?'Change banner':'Add banner'}</button>
          {banner&&<button type="button" onClick={()=>void removeBanner()}><Trash2 size={14}/>Remove banner</button>}
          <button type="button" className="danger" onClick={()=>{setMenuOpen(false);onDeleteItem?.()}}><Trash2 size={14}/>Delete item</button>
        </div>}
      </div>
    </div>
    {error&&<p className="interest-error">{error}</p>}
  </section>
}
