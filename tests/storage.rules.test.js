import { readFile } from 'node:fs/promises'
import { before, after, test } from 'node:test'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes } from 'firebase/storage'

const PROJECT_ID = 'demo-solace'
let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: await readFile('storage.rules', 'utf8') },
  })
})

after(async () => { await testEnv.cleanup() })

test('owner can upload and read an image in their media path', async () => {
  const storage = testEnv.authenticatedContext('alice').storage()
  const mediaRef = ref(storage, 'users/alice/media/photo-1')
  await assertSucceeds(uploadBytes(mediaRef, new Uint8Array([1, 2, 3]), { contentType: 'image/png' }))
  await assertSucceeds(getBytes(mediaRef))
})

test('another account cannot read or write owner media', async () => {
  const alice = testEnv.authenticatedContext('alice').storage()
  await assertSucceeds(uploadBytes(ref(alice, 'users/alice/media/photo-2'), new Uint8Array([1]), { contentType: 'image/jpeg' }))
  const bob = testEnv.authenticatedContext('bob').storage()
  await assertFails(getBytes(ref(bob, 'users/alice/media/photo-2')))
  await assertFails(uploadBytes(ref(bob, 'users/alice/media/photo-2'), new Uint8Array([1]), { contentType: 'image/jpeg' }))
})

test('non-media types and oversized uploads are rejected', async () => {
  const storage = testEnv.authenticatedContext('alice').storage()
  await assertFails(uploadBytes(ref(storage, 'users/alice/media/other-1'), new Uint8Array([1]), { contentType: 'text/plain' }))
  const oversized = new Uint8Array(10 * 1024 * 1024 + 1)
  await assertFails(uploadBytes(ref(storage, 'users/alice/media/large-1'), oversized, { contentType: 'audio/mpeg' }))
})

test('unmatched paths are denied', async () => {
  const storage = testEnv.authenticatedContext('alice').storage()
  await assertFails(uploadBytes(ref(storage, 'public/loose-file'), new Uint8Array([1]), { contentType: 'image/png' }))
})
