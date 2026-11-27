import { useEffect, useRef, useState } from 'react'
import { getMediaAsset, saveMediaAsset, deleteMediaAsset } from '../../db'
import type { MediaAsset } from '../../features/whats-up/types'
import type { MediaAssetReference } from '../../features/skills-hobbies/types'
import { ImagePlus, Trash2, Crop, Check, X } from 'lucide-react'

type MediaUploaderProps = {
  banner?: MediaAssetReference
  images: MediaAssetReference[]
  onChange: (banner: MediaAssetReference | undefined, images: MediaAssetReference[]) => void
  title?: string
}
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif']
function reference(asset: MediaAsset): MediaAssetReference {
  return { id: asset.id, mimeType: asset.mimeType, fileName: asset.fileName, size: asset.size }
}
type Point = { x:number; y:number }
export default function MediaUploader({ banner, images, onChange, title = 'Images' }: MediaUploaderProps) {
  const [urls,setUrls]=useState<Record<string,string>>({})
  const [error,setError]=useState('')
  const [cropSource,setCropSource]=useState('')
  const [cropFileName,setCropFileName]=useState('banner.jpg')
  const [zoom,setZoom]=useState(1)
  const [offset,setOffset]=useState<Point>({x:0,y:0})
  const [saving,setSaving]=useState(false)
  const pointers=useRef(new Map<number,Point>())
  const gesture=useRef<{distance:number;zoom:number;offset:Point;center:Point}|null>(null)
  const viewport=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    let disposed=false
    const refs=[...(banner?[banner]:[]),...images]
    Promise.all(refs.map(async ref=>{const asset=await getMediaAsset(ref.id);return asset?.blob?[ref.id,URL.createObjectURL(asset.blob)] as const:null})).then(results=>{
      if(disposed){results.forEach(result=>result&&URL.revokeObjectURL(result[1]));return}
      const next:Record<string,string>={};results.forEach(result=>{if(result)next[result[0]]=result[1]})
      setUrls(previous=>{Object.values(previous).forEach(URL.revokeObjectURL);return next})
    })
    return ()=>{disposed=true}
  },[banner?.id,images.map(image=>image.id).join('|')])
  useEffect(()=>()=>{Object.values(urls).forEach(URL.revokeObjectURL)},[urls])
  function chooseBanner(file?:File){
    if(!file)return
    setError('')
    if(!ALLOWED.includes(file.type)){setError('Choose a JPG, PNG, WEBP, or GIF image.');return}
    if(file.size>MAX_IMAGE_SIZE){setError('Images must be 8 MB or smaller.');return}
    const reader=new FileReader()
    reader.onload=()=>{setCropSource(String(reader.result||''));setCropFileName(file.name);setZoom(1);setOffset({x:0,y:0})}
    reader.onerror=()=>setError('Could not read this image.')
    reader.readAsDataURL(file)
  }
  async function saveCrop(){
    if(!cropSource||saving)return
    setSaving(true);setError('')
    try{
      const image=new Image()
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Image could not be processed'));image.src=cropSource})
      const rect=viewport.current?.getBoundingClientRect()
      if(!rect)throw new Error('Crop area unavailable')
      const base=Math.max(rect.width/image.width,rect.height/image.height)
      const scale=base*zoom
      const renderedW=image.width*scale,renderedH=image.height*scale
      const left=(rect.width-renderedW)/2+offset.x,top=(rect.height-renderedH)/2+offset.y
      const sx=Math.max(0,Math.min(image.width-rect.width/scale,-left/scale))
      const sy=Math.max(0,Math.min(image.height-rect.height/scale,-top/scale))
      const sw=Math.min(image.width-sx,rect.width/scale),sh=Math.min(image.height-sy,rect.height/scale)
      const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=810
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable')
      ctx.drawImage(image,sx,sy,sw,sh,0,0,1440,810)
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not export crop')),'image/jpeg',.88))
      const id=crypto.randomUUID(),now=new Date().toISOString()
      const asset:MediaAsset={id,blob,mimeType:'image/jpeg',fileName:cropFileName.replace(/\.[^.]+$/,'')+'-banner.jpg',size:blob.size,createdAt:now,updatedAt:now}
      await saveMediaAsset(asset)
      onChange(reference(asset),images)
      setCropSource('')
    }catch{setError('Could not save the cropped banner. Please try again.')}
    finally{setSaving(false)}
  }
  async function uploadGallery(file?:File){
    if(!file)return
    setError('')
    if(!ALLOWED.includes(file.type)){setError('Choose a JPG, PNG, WEBP, or GIF image.');return}
    if(file.size>MAX_IMAGE_SIZE){setError('Images must be 8 MB or smaller.');return}
    const id=crypto.randomUUID(),now=new Date().toISOString()
    const asset:MediaAsset={id,blob:file,mimeType:file.type,fileName:file.name,size:file.size,createdAt:now,updatedAt:now}
    try{await saveMediaAsset(asset);onChange(banner,[...images,reference(asset)])}catch{setError('Could not save the image locally.')}
  }
  async function remove(ref:MediaAssetReference,asBanner:boolean){
    try{await deleteMediaAsset(ref.id);if(asBanner)onChange(undefined,images);else onChange(banner,images.filter(image=>image.id!==ref.id))}catch{setError('Could not remove this image.')}
  }
  function pointDistance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y)}
  function onPointerDown(event:React.PointerEvent<HTMLDivElement>){
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
    const points=[...pointers.current.values()]
    if(points.length===2)gesture.current={distance:pointDistance(points[0],points[1]),zoom,offset,center:{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}}
    else gesture.current={distance:0,zoom,offset,center:{x:event.clientX,y:event.clientY}}
  }
  function onPointerMove(event:React.PointerEvent<HTMLDivElement>){
    if(!pointers.current.has(event.pointerId))return
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
    const points=[...pointers.current.values()],start=gesture.current
    if(!start)return
    if(points.length>=2&&start.distance>0){setZoom(Math.max(1,Math.min(4,start.zoom*pointDistance(points[0],points[1])/start.distance)));setOffset(start.offset)}
    else setOffset({x:start.offset.x+event.clientX-start.center.x,y:start.offset.y+event.clientY-start.center.y})
  }
  function onPointerUp(event:React.PointerEvent<HTMLDivElement>){pointers.current.delete(event.pointerId);gesture.current=null}
  const previewUrl=banner?urls[banner.id]:undefined
  return <section className="media-uploader">
    <div className="media-uploader-heading">{title}</div>
    <div className="media-banner-slot">
      {previewUrl?<div className="media-preview media-banner"><img src={previewUrl} alt="Skill or hobby banner"/><div className="media-banner-actions"><label title="Change or crop banner"><Crop size={14}/><span>Edit</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{chooseBanner(e.target.files?.[0]);e.currentTarget.value=''}}/></label><button type="button" onClick={()=>void remove(banner!,true)} aria-label="Remove banner"><Trash2 size={13}/></button></div></div>:<label className="media-add media-banner-add"><ImagePlus size={16}/><span>Add banner</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{chooseBanner(e.target.files?.[0]);e.currentTarget.value=''}}/></label>}
    </div>
    <div className="media-gallery">{images.map(ref=>urls[ref.id]?<div className="media-preview media-gallery-preview" key={ref.id}><img src={urls[ref.id]} alt={ref.fileName}/><button type="button" onClick={()=>void remove(ref,false)} aria-label={'Remove '+ref.fileName}><Trash2 size={13}/></button></div>:null)}<label className="media-add media-gallery-add"><ImagePlus size={16}/><span>Add showcase image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{void uploadGallery(e.target.files?.[0]);e.currentTarget.value=''}}/></label></div>
    {error&&<p className="interest-error">{error}</p>}
    {cropSource&&<div className="banner-crop-backdrop" role="dialog" aria-modal="true" aria-label="Edit banner"><div className="banner-crop-dialog"><div className="banner-crop-heading"><div><span>IMAGE EDITOR</span><h3>Adjust your banner</h3></div><button type="button" onClick={()=>setCropSource('')} aria-label="Close crop editor"><X size={18}/></button></div><div ref={viewport} className="banner-crop-viewport" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><img src={cropSource} alt="Banner crop preview" draggable={false} style={{transform:'translate('+offset.x+'px, '+offset.y+'px) scale('+zoom+')'}}/><span>Drag to reposition · Pinch to zoom</span></div><label className="banner-crop-zoom">Zoom<input type="range" min="1" max="4" step=".01" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><div className="banner-crop-footer"><button type="button" className="banner-crop-cancel" onClick={()=>setCropSource('')}>Cancel</button><button type="button" className="new-button" onClick={()=>void saveCrop()} disabled={saving}>{saving?'Saving…':<>Save banner <Check size={14}/></>}</button></div></div></div>}
  </section>
}
