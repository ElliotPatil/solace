import type { Skill, Hobby, InterestConnection } from './features/skills-hobbies/types'
import type { EntertainmentItem, Song, MusicPlaylist, CurrentActivity, SpotifyConnection, SpotifyImportRecord, MediaAsset } from './features/whats-up/types'

export type EntryKind = 'memory' | 'reflection' | 'experience'
export type Privacy = 'private' | 'ai-readable' | 'shareable'
export interface Entry { id:string; kind:EntryKind; title:string; body:string; createdAt:string; updatedAt?:string; privacy:Privacy; collectionId?:string; pinned?:boolean; tags?:string[]; photos?:string[]; audioData?:string; audioName?:string }
export interface Collection { id:string; name:string; description:string; createdAt:string }
export interface Draft { id:string; kind:EntryKind; title:string; body:string; createdAt:string; updatedAt:string; privacy:Privacy; collectionId?:string; tags?:string[]; photos?:string[]; audioData?:string; audioName?:string }
export type MoodValue = 'Heavy' | 'Low' | 'Steady' | 'Good' | 'Bright'
export interface MoodCheckin { id:string; mood:MoodValue; note?:string; createdAt:string }
export interface QuietMoment { id:string; text:string; createdAt:string }

const DB_BASE='solace-local'
const DB_VERSION=6
const ENTRIES='entries'
const COLLECTIONS='collections'
const DRAFTS='drafts'
const MOODS='mood-checkins'
const QUIET_MOMENTS='quiet-moments'
const SKILLS='skills'
const HOBBIES='hobbies'
const INTEREST_CONNECTIONS='interest-connections'
const ENTERTAINMENT='entertainment-items'
const SONGS='songs'
const PLAYLISTS='music-playlists'
const CURRENT_ACTIVITIES='current-activities'
const SPOTIFY_CONNECTIONS='spotify-connections'
const SPOTIFY_IMPORTS='spotify-imports'
const MEDIA_ASSETS='media-assets'

// The guest database keeps legacy local records. Signed-in accounts get a separate
// database name, preventing accidental cross-account access on shared devices.
let activeAccountUid:string|null=null
export function setAccountScope(uid:string|null):void {
  activeAccountUid=uid
}
function databaseName():string {
  return activeAccountUid ? `${DB_BASE}-user-${encodeURIComponent(activeAccountUid)}` : DB_BASE
}
function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName(),DB_VERSION)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES,{keyPath:'id'})
      if(!db.objectStoreNames.contains(COLLECTIONS)) db.createObjectStore(COLLECTIONS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(MOODS)) db.createObjectStore(MOODS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(QUIET_MOMENTS)) db.createObjectStore(QUIET_MOMENTS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(SKILLS)) db.createObjectStore(SKILLS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(HOBBIES)) db.createObjectStore(HOBBIES,{keyPath:'id'})
      if(!db.objectStoreNames.contains(INTEREST_CONNECTIONS)) db.createObjectStore(INTEREST_CONNECTIONS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(ENTERTAINMENT)) db.createObjectStore(ENTERTAINMENT,{keyPath:'id'})
      if(!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(PLAYLISTS)) db.createObjectStore(PLAYLISTS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(CURRENT_ACTIVITIES)) db.createObjectStore(CURRENT_ACTIVITIES,{keyPath:'id'})
      if(!db.objectStoreNames.contains(SPOTIFY_CONNECTIONS)) db.createObjectStore(SPOTIFY_CONNECTIONS,{keyPath:'spotifyUserId'})
      if(!db.objectStoreNames.contains(SPOTIFY_IMPORTS)) db.createObjectStore(SPOTIFY_IMPORTS,{keyPath:'id'})
      if(!db.objectStoreNames.contains(MEDIA_ASSETS)) db.createObjectStore(MEDIA_ASSETS,{keyPath:'id'})
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
export async function saveEntry(entry:Entry):Promise<void>{const next={...entry,updatedAt:new Date().toISOString()};await runRequest(ENTRIES,'readwrite',store=>store.put(next))}
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


// Feature-store helpers. Each call uses the currently selected account database.
async function getAllRecords<T>(storeName:string):Promise<T[]> { return runRequest<T[]>(storeName,'readonly',store=>store.getAll()) }
async function saveRecord<T>(storeName:string,item:T):Promise<void> { await runRequest(storeName,'readwrite',store=>store.put(item)) }
async function deleteRecord(storeName:string,id:IDBValidKey):Promise<void> { await runRequest(storeName,'readwrite',store=>store.delete(id)) }

// Skills & Hobbies
export async function getSkills():Promise<Skill[]>{return (await getAllRecords<Skill>(SKILLS)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
export async function saveSkill(item:Skill):Promise<void>{await saveRecord(SKILLS,item)}
export async function deleteSkill(id:string):Promise<void>{await deleteRecord(SKILLS,id)}
export async function getHobbies():Promise<Hobby[]>{return (await getAllRecords<Hobby>(HOBBIES)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
export async function saveHobby(item:Hobby):Promise<void>{await saveRecord(HOBBIES,item)}
export async function deleteHobby(id:string):Promise<void>{await deleteRecord(HOBBIES,id)}
export async function getInterestConnections():Promise<InterestConnection[]>{return getAllRecords<InterestConnection>(INTEREST_CONNECTIONS)}
export async function saveInterestConnection(item:InterestConnection):Promise<void>{await saveRecord(INTEREST_CONNECTIONS,item)}
export async function deleteInterestConnection(id:string):Promise<void>{await deleteRecord(INTEREST_CONNECTIONS,id)}

// What's Up?
export async function getEntertainmentItems():Promise<EntertainmentItem[]>{return getAllRecords<EntertainmentItem>(ENTERTAINMENT)}
export async function saveEntertainmentItem(item:EntertainmentItem):Promise<void>{await saveRecord(ENTERTAINMENT,item)}
export async function deleteEntertainmentItem(id:string):Promise<void>{await deleteRecord(ENTERTAINMENT,id)}
export async function getSongs():Promise<Song[]>{return getAllRecords<Song>(SONGS)}
export async function saveSong(item:Song):Promise<void>{await saveRecord(SONGS,item)}
export async function deleteSong(id:string):Promise<void>{await deleteRecord(SONGS,id)}
export async function getMusicPlaylists():Promise<MusicPlaylist[]>{return getAllRecords<MusicPlaylist>(PLAYLISTS)}
export async function saveMusicPlaylist(item:MusicPlaylist):Promise<void>{await saveRecord(PLAYLISTS,item)}
export async function deleteMusicPlaylist(id:string):Promise<void>{await deleteRecord(PLAYLISTS,id)}
export async function getCurrentActivities():Promise<CurrentActivity[]>{return getAllRecords<CurrentActivity>(CURRENT_ACTIVITIES)}
export async function saveCurrentActivity(item:CurrentActivity):Promise<void>{await saveRecord(CURRENT_ACTIVITIES,item)}
export async function deleteCurrentActivity(id:string):Promise<void>{await deleteRecord(CURRENT_ACTIVITIES,id)}
export async function getSpotifyConnection():Promise<SpotifyConnection|undefined>{return getAllRecords<SpotifyConnection>(SPOTIFY_CONNECTIONS).then(rows=>rows[0])}
export async function saveSpotifyConnection(item:SpotifyConnection):Promise<void>{await saveRecord(SPOTIFY_CONNECTIONS,item)}
export async function deleteSpotifyConnection(spotifyUserId:string):Promise<void>{await deleteRecord(SPOTIFY_CONNECTIONS,spotifyUserId)}
export async function getSpotifyImports():Promise<SpotifyImportRecord[]>{return getAllRecords<SpotifyImportRecord>(SPOTIFY_IMPORTS)}
export async function saveSpotifyImport(item:SpotifyImportRecord):Promise<void>{await saveRecord(SPOTIFY_IMPORTS,item)}
export async function deleteSpotifyImport(id:string):Promise<void>{await deleteRecord(SPOTIFY_IMPORTS,id)}

// Store image/audio binaries as Blob records, not base64 strings in feature records.
export async function getMediaAsset(id:string):Promise<MediaAsset|undefined>{return runRequest<MediaAsset|undefined>(MEDIA_ASSETS,'readonly',store=>store.get(id))}
export async function saveMediaAsset(item:MediaAsset):Promise<void>{await saveRecord(MEDIA_ASSETS,item)}
export async function deleteMediaAsset(id:string):Promise<void>{await deleteRecord(MEDIA_ASSETS,id)}
