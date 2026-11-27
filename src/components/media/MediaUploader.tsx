import { useEffect, useRef, useState } from 'react'
import { getMediaAsset, saveMediaAsset, deleteMediaAsset } from '../../db'
import type { MediaAsset } from '../../features/whats-up/types'
import type { MediaAssetReference } from '../../features/skills-hobbies/types'
import { Plus, MoreHorizontal, ArrowRight, Trash2, X, Check } from 'lucide-react'

type MediaUploaderProps = {
  banner?: MediaAssetReference
  images: MediaAssetReference[]
  onChange: (banner: MediaAssetReference | undefined, images: MediaAssetReference[]) => void
  onDeleteItem?: () => void
  title?: string
}
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif']
const CARD_RATIO = 1.02
function reference(asset: MediaAsset): MediaAssetReference {
  return { id: asset.id, mimeType: asset.mimeType, fileName: asset.fileName, size: asset.size }
}
export default function MediaUploader({ banner, onChange, onDeleteItem }: MediaUploaderProps) {
  const [url,setUrl]=useState('')
  const [error,setError]=useState('')
  const [menuOpen,setMenuOpen]=useState(false)
  const [cropSource,setCropSource]=useState('')
  const [cropFile,setCropFile]=useState<File|null>(null)
  const [zoom,setZoom]=useState(1)
  const [offset,setOffset]=useState({x:0,y:0})
  const inputRef=useRef<HTMLInputElement>(null)
  const cropRef=useRef<HTMLDivElement>(null)
  const gesture=useRef<{points:Map<number,{x:number,y:number}>;distance:number;zoom:number;offset:{x:number,y:number}}|null>(null)
  useEffect(()=>{
    let disposed=false
    if(!banner){setUrl('');return}
    getMediaAsset(banner.id).then(asset=>{if(!disposed&&asset?.blob)setUrl(URL.createObjectURL(asset.blob))})
    return ()=>{disposed=true}
  },[banner?.id])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url])
  function beginCrop(file:File){
    if(!ALLOWED.includes(file.type)){setError('Choose a JPG, PNG, WEBP, or GIF image.');return}
    if(file.size>MAX_IMAGE_SIZE){setError('Images must be 8 MB or smaller.');return}
    setCropFile(file);setCropSource(URL.createObjectURL(file));setZoom(1);setOffset({x:0,y:0});setError('')
  }
  function closeCrop(){if(cropSource)URL.revokeObjectURL(cropSource);setCropSource('');setCropFile(null)}
  function pointerDown(e:React.PointerEvent<HTMLDivElement>){
    e.currentTarget.setPointerCapture(e.pointerId)
    const g=gesture.current||{points:new Map(),distance:0,zoom:zoom,offset:offset}
    g.points.set(e.pointerId,{x:e.clientX,y:e.clientY});g.zoom=zoom;g.offset=offset
    if(g.points.size===2){const p=[...g.points.values()];g.distance=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)}
    gesture.current=g
  }
  function pointerMove(e:React.PointerEvent<HTMLDivElement>){
    const g=gesture.current;if(!g||!g.points.has(e.pointerId))return
    const old=g.points.get(e.pointerId)!;g.points.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if(g.points.size===2){const p=[...g.points.values()];const d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);if(g.distance>0)setZoom(Math.max(1,Math.min(4,g.zoom*d/g.distance)))}
    else setOffset(v=>({x:v.x+e.clientX-old.x,y:v.y+e.clientY-old.y}))
  }
  function pointerUp(e:React.PointerEvent<HTMLDivElement>){const g=gesture.current;if(!g)return;g.points.delete(e.pointerId);if(g.points.size<2)g.distance=0;if(!g.points.size)gesture.current=null}
  async function saveCrop(){
    if(!cropFile||!cropSource)return
    try{
      const image=new Image();image.src=cropSource;await image.decode()
      const rect=cropRef.current?.getBoundingClientRect();if(!rect)throw new Error('Crop area unavailable')
      const outW=1200,outH=Math.round(outW/CARD_RATIO),scale=Math.max(rect.width/image.width,rect.height/image.height)
      const w=image.width*scale*zoom,h=image.height*scale*zoom
      const panX=Math.max(-Math.max(0,(w-rect.width)/2),Math.min(Math.max(0,(w-rect.width)/2),offset.x))
      const panY=Math.max(-Math.max(0,(h-rect.height)/2),Math.min(Math.max(0,(h-rect.height)/2),offset.y))
      const sx=(w/2+rect.width/2-panX-rect.width/2)/w*image.width
      const sy=(h/2+rect.height/2-panY-rect.height/2)/h*image.height
      const sw=rect.width/w*image.width,sh=rect.height/h*image.height
      const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable')
      ctx.drawImage(image,Math.max(0,Math.min(image.width-sw,sx)),Math.max(0,Math.min(image.height-sh,sy)),Math.min(sw,image.width),Math.min(sh,image.height),0,0,outW,outH)
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Crop failed')),'image/jpeg',.92))
      const id=crypto.randomUUID(),now=new Date().toISOString(),fileName=cropFile.name.replace(/\.[^.]+$/,'')+'-banner.jpg'
      const asset:MediaAsset={id,blob,mimeType:'image/jpeg',fileName,size:blob.size,createdAt:now,updatedAt:now}
      await saveMediaAsset(asset);const previous=banner;onChange(reference(asset),[]);if(previous)await deleteMediaAsset(previous.id);closeCrop()
    }catch{setError('Could not crop and save this image. Please try again.')}
  }
  async function removeBanner(){if(!banner)return;try{await deleteMediaAsset(banner.id);onChange(undefined,[]);setMenuOpen(false)}catch{setError('Could not remove this banner.')}}
  return <section className="media-uploader">
    <div className="media-banner-slot">
      {url&&<div className="media-preview media-banner"><img src={url} alt="Skill or hobby banner"/></div>}
      <input ref={inputRef} className="media-banner-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const file=e.target.files?.[0];if(file)beginCrop(file);e.currentTarget.value=''}}/>
      <button type="button" className="interest-card-banner-add" onClick={()=>inputRef.current?.click()} aria-label={banner?'Change banner':'Add banner'}><Plus size={17}/></button>
      <div className="interest-card-menu-wrap">
        <button type="button" className="interest-card-menu-trigger" aria-label="More actions" onClick={()=>setMenuOpen(v=>!v)}><MoreHorizontal size={19}/></button>
        {menuOpen&&<div className="interest-card-menu"><button type="button" onClick={()=>{setMenuOpen(false);inputRef.current?.click()}}><ArrowRight size={14}/>{banner?'Change banner':'Add banner'}</button>{banner&&<button type="button" onClick={()=>void removeBanner()}><Trash2 size={14}/>Remove banner</button>}<button type="button" className="danger" onClick={()=>{setMenuOpen(false);onDeleteItem?.()}}><Trash2 size={14}/>Delete item</button></div>}
      </div>
    </div>
    {error&&<p className="interest-error">{error}</p>}
    {cropSource&&<div className="banner-crop-backdrop"><section className="banner-crop-dialog" role="dialog" aria-modal="true" aria-label="Crop skill card banner"><div className="banner-crop-heading"><div><span>SKILL CARD BANNER</span><h3>Frame your image.</h3></div><button type="button" onClick={closeCrop} aria-label="Cancel crop"><X size={18}/></button></div><p className="banner-crop-hint">Move with one finger. Pinch with two fingers to zoom.</p><div ref={cropRef} className="banner-crop-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><img src={cropSource} alt="Crop preview" style={{transform:'translate('+offset.x+'px,'+offset.y+'px) scale('+zoom+')'}}/><span>PREVIEW · CARD PROPORTIONS</span></div><label className="banner-crop-zoom">ZOOM<input type="range" min="1" max="4" step=".01" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><div className="banner-crop-footer"><button type="button" className="banner-crop-cancel" onClick={closeCrop}>Cancel</button><button type="button" className="new-button" onClick={()=>void saveCrop()}><Check size={14}/> Use image</button></div></section></div>}
  </section>
}
