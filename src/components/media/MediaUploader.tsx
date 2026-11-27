import { useEffect, useState } from 'react'
import { getMediaAsset, saveMediaAsset, deleteMediaAsset } from '../../db'
import type { MediaAsset } from '../../features/whats-up/types'
import type { MediaAssetReference } from '../../features/skills-hobbies/types'
import { ImagePlus, Trash2 } from 'lucide-react'

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
export default function MediaUploader({ banner, images, onChange, title = 'Images' }: MediaUploaderProps) {
  const [urls,setUrls]=useState<Record<string,string>>({})
  const [error,setError]=useState('')
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
  async function chooseBanner(file?:File){
    if(!file)return
    setError('')
    if(!ALLOWED.includes(file.type)){setError('Choose a JPG, PNG, WEBP, or GIF image.');return}
    if(file.size>MAX_IMAGE_SIZE){setError('Images must be 8 MB or smaller.');return}
    const id=crypto.randomUUID(),now=new Date().toISOString()
    const asset:MediaAsset={id,blob:file,mimeType:file.type,fileName:file.name,size:file.size,createdAt:now,updatedAt:now}
    try{await saveMediaAsset(asset);onChange(reference(asset),images)}
    catch{setError('Could not save the original image locally.')}
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
    try{await deleteMediaAsset(ref.id);if(asBanner)onChange(undefined,images);else onChange(banner,images.filter(image=>image.id!==ref.id))}
    catch{setError('Could not remove this image.')}
  }
  const previewUrl=banner?urls[banner.id]:undefined
  return <section className="media-uploader">
    <div className="media-uploader-heading">{title}</div>
    <div className="media-banner-slot">
      {previewUrl?<div className="media-preview media-banner"><img src={previewUrl} alt="Full skill or hobby banner"/><div className="media-banner-actions"><label title="Replace banner"><ImagePlus size={14}/><span>Change</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{void chooseBanner(e.target.files?.[0]);e.currentTarget.value=''}}/></label><button type="button" onClick={()=>void remove(banner!,true)} aria-label="Remove banner"><Trash2 size={13}/></button></div></div>:<label className="media-add media-banner-add"><ImagePlus size={16}/><span>Add banner</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{void chooseBanner(e.target.files?.[0]);e.currentTarget.value=''}}/></label>}
    </div>
    <div className="media-gallery">{images.map(ref=>urls[ref.id]?<div className="media-preview media-gallery-preview" key={ref.id}><img src={urls[ref.id]} alt={ref.fileName}/><button type="button" onClick={()=>void remove(ref,false)} aria-label={'Remove '+ref.fileName}><Trash2 size={13}/></button></div>:null)}<label className="media-add media-gallery-add"><ImagePlus size={16}/><span>Add showcase image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{void uploadGallery(e.target.files?.[0]);e.currentTarget.value=''}}/></label></div>
    {error&&<p className="interest-error">{error}</p>}
  </section>
}
