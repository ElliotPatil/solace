export type EntryKind = 'memory' | 'reflection' | 'experience'
export type Privacy = 'private' | 'ai-readable' | 'shareable'
export interface Entry { id:string; kind:EntryKind; title:string; body:string; createdAt:string; privacy:Privacy; collectionId?:string; pinned?:boolean; tags?:string[] }
export interface Collection { id:string; name:string; description:string; createdAt:string }
export interface Draft { id:string; kind:EntryKind; title:string; body:string; createdAt:string; updatedAt:string; privacy:Privacy; collectionId?:string; tags?:string[] }
export type MoodValue = 'Heavy' | 'Low' | 'Steady' | 'Good' | 'Bright'
export interface MoodCheckin { id:string; mood:MoodValue; note?:string; createdAt:string }
export interface QuietMoment { id:string; text:string; createdAt:string }

const DB_NAME='solace-local'
const DB_VERSION=4
const ENTRIES='entries'
const COLLECTIONS='collections'
const DRAFTS='drafts'
const MOODS='mood-checkins'
const QUIET_MOMENTS='quiet-moments'

function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES,{keyPath:'id'})
      if(!db.objectStoreNames.contains(COLLECTIONS)) db.createObjectStore(COLLECTIONS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(MOODS)) db.createObjectStore(MOODS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(QUIET_MOMENTS)) db.createObjectStore(QUIET_MOMENTS,{keyPath:'id'})
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
  })
}
function runRequest<T>(storeName:string,mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  return openDatabase().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(storeName,mode)
    const request=operation(tx.objectStore(storeName))
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
    tx.oncomplete=()=>db.close()
    tx.onerror=()=>{db.close();reject(tx.error)}
    tx.onabort=()=>{db.close();reject(tx.error)}
  }))
}
export async function getEntries():Promise<Entry[]>{
  const rows=await runRequest<Entry[]>(ENTRIES,'readonly',store=>store.getAll())
  return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
}
export async function saveEntry(entry:Entry):Promise<void>{await runRequest(ENTRIES,'readwrite',store=>store.put(entry))}
export async function deleteEntry(id:string):Promise<void>{await runRequest(ENTRIES,'readwrite',store=>store.delete(id))}
export async function getCollections():Promise<Collection[]>{
  const rows=await runRequest<Collection[]>(COLLECTIONS,'readonly',store=>store.getAll())
  return rows.sort((a,b)=>a.name.localeCompare(b.name))
}
export async function saveCollection(collection:Collection):Promise<void>{await runRequest(COLLECTIONS,'readwrite',store=>store.put(collection))}
export async function deleteCollection(id:string):Promise<void>{
  const db=await openDatabase()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([COLLECTIONS,ENTRIES],'readwrite')
    tx.objectStore(COLLECTIONS).delete(id)
    const req=tx.objectStore(ENTRIES).getAll()
    req.onsuccess=()=>{
      (req.result as Entry[]).filter(entry=>entry.collectionId===id).forEach(entry=>{
        delete entry.collectionId
        tx.objectStore(ENTRIES).put(entry)
      })
    }
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onerror=()=>{db.close();reject(tx.error)}
    tx.onabort=()=>{db.close();reject(tx.error)}
  })
}

export async function getDrafts():Promise<Draft[]>{
  const rows=await runRequest<Draft[]>(DRAFTS,'readonly',store=>store.getAll())
  return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
}
export async function saveDraft(draft:Draft):Promise<void>{await runRequest(DRAFTS,'readwrite',store=>store.put(draft))}
export async function deleteDraft(id:string):Promise<void>{await runRequest(DRAFTS,'readwrite',store=>store.delete(id))}

export async function getMoodCheckins():Promise<MoodCheckin[]>{const rows=await runRequest<MoodCheckin[]>(MOODS,'readonly',store=>store.getAll());return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
export async function saveMoodCheckin(item:MoodCheckin):Promise<void>{await runRequest(MOODS,'readwrite',store=>store.put(item))}
export async function getQuietMoments():Promise<QuietMoment[]>{const rows=await runRequest<QuietMoment[]>(QUIET_MOMENTS,'readonly',store=>store.getAll());return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
export async function saveQuietMoment(item:QuietMoment):Promise<void>{await runRequest(QUIET_MOMENTS,'readwrite',store=>store.put(item))}
