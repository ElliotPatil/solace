export type EntryKind = 'memory' | 'reflection' | 'experience'
export type Privacy = 'private' | 'ai-readable' | 'shareable'

export interface Entry {
  id: string
  kind: EntryKind
  title: string
  body: string
  createdAt: string
  privacy: Privacy
}

const DB_NAME = 'solace-local'
const STORE = 'entries'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getEntries(): Promise<Entry[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result as Entry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    request.onerror = () => reject(request.error)
  })
}

export async function saveEntry(entry: Entry): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}