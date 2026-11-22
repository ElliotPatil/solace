export type EntryKind = 'memory' | 'reflection' | 'experience'
export type Privacy = 'private' | 'ai-readable' | 'shareable'
export interface Entry { id:string; kind:EntryKind; title:string; body:string; createdAt:string; privacy:Privacy; collectionId?:string }
export interface Collection { id:string; name:string; description:string; createdAt:string }
const DB_NAME='solace-local'; const DB_VERSION=2; const ENTRIES='entries'; const COLLECTIONS='collections'
function openDatabase():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION)
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(ENTRIES))db.createObjectStore(ENTRIES,{keyPath:'id'});if(!db.objectStoreNames.contains(COLLECTIONS))db.createObjectStore(COLLECTIONS,{keyPath:'id'})}
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
 })
}
export async function getEntries():Promise<Entry[]>{const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(ENTRIES,'readonly').objectStore(ENTRIES).getAll();r.onsuccess=()=>resolve((r.result as Entry[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>reject(r.error)})}
export async function saveEntry(entry:Entry):Promise<void>{const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(ENTRIES,'readwrite').objectStore(ENTRIES).put(entry);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
export async function deleteEntry(id:string):Promise<void>{const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(ENTRIES,'readwrite').objectStore(ENTRIES).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
export async function getCollections():Promise<Collection[]>{const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(COLLECTIONS,'readonly').objectStore(COLLECTIONS).getAll();r.onsuccess=()=>resolve((r.result as Collection[]).sort((a,b)=>a.name.localeCompare(b.name)));r.onerror=()=>reject(r.error)})}
export async function saveCollection(collection:Collection):Promise<void>{const db=await openDatabase();return new Promise((resolve,reject)=>{const r=db.transaction(COLLECTIONS,'readwrite').objectStore(COLLECTIONS).put(collection);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
export async function deleteCollection(id:string):Promise<void>{const db=await openDatabase();const db2=await openDatabase();return new Promise((resolve,reject)=>{const tx=db2.transaction([COLLECTIONS,ENTRIES],'readwrite');tx.objectStore(COLLECTIONS).delete(id);const req=tx.objectStore(ENTRIES).getAll();req.onsuccess=()=>{(req.result as Entry[]).filter(e=>e.collectionId===id).forEach(e=>{e.collectionId=undefined;tx.objectStore(ENTRIES).put(e)})};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
