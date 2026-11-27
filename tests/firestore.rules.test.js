import { readFile } from 'node:fs/promises'
import { before, after, beforeEach, test } from 'node:test'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const PROJECT_ID = 'demo-solace'
let testEnv

const entry = (id = 'e1') => ({
  id,
  kind: 'memory',
  title: 'Test memory',
  body: 'Test body',
  createdAt: new Date().toISOString(),
  privacy: 'private',
})

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
})

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

test('a user can create and read their own entry', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  const ref = doc(db, 'users/alice/entries/e1')
  await assertSucceeds(setDoc(ref, entry()))
  await assertSucceeds(getDoc(ref))
})

test('a different user cannot read another account entry', async () => {
  const alice = testEnv.authenticatedContext('alice').firestore()
  await assertSucceeds(setDoc(doc(alice, 'users/alice/entries/e1'), entry()))
  const bob = testEnv.authenticatedContext('bob').firestore()
  await assertFails(getDoc(doc(bob, 'users/alice/entries/e1')))
})

test('unauthenticated access to personal entries is denied', async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'users/alice/entries/e1')))
})

test('unexpected entry fields are rejected', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  await assertFails(setDoc(doc(db, 'users/alice/entries/e1'), {
    ...entry(),
    unexpected: true,
  }))
})

test('a user can write only their own collection, draft, mood, and quiet-moment records', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  await assertSucceeds(setDoc(doc(db, 'users/alice/collections/c1'), {
    id: 'c1', name: 'Collection', description: '', createdAt: new Date().toISOString(),
  }))
  await assertSucceeds(setDoc(doc(db, 'users/alice/drafts/d1'), {
    id: 'd1', kind: 'reflection', title: 'Draft', body: '', createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), privacy: 'private',
  }))
  await assertSucceeds(setDoc(doc(db, 'users/alice/moodCheckins/m1'), {
    id: 'm1', mood: 'Steady', createdAt: new Date().toISOString(),
  }))
  await assertSucceeds(setDoc(doc(db, 'users/alice/quietMoments/q1'), {
    id: 'q1', text: 'A quiet note', createdAt: new Date().toISOString(),
  }))
})

test('a user cannot write records into another UID path', async () => {
  const bob = testEnv.authenticatedContext('bob').firestore()
  await assertFails(setDoc(doc(bob, 'users/alice/entries/e1'), entry()))
})

test('profile creation succeeds but createdAt cannot be changed later', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  const profileRef = doc(db, 'users/alice')
  const createdAt = new Date().toISOString()
  await assertSucceeds(setDoc(profileRef, {
    uid: 'alice',
    displayName: 'Alice',
    email: 'alice@example.test',
    photoURL: null,
    createdAt,
    lastLoginAt: createdAt,
    updatedAt: createdAt,
  }))
  await assertFails(updateDoc(profileRef, { createdAt: 'changed' }))
})

test('users cannot add unvalidated media fields to cloud entries', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  await assertFails(setDoc(doc(db, 'users/alice/entries/e1'), {
    ...entry(),
    audioData: 'base64-payload',
  }))
})

test('unmatched collection paths remain denied', async () => {
  const db = testEnv.authenticatedContext('alice').firestore()
  await assertFails(setDoc(doc(db, 'users/alice/unknown/record1'), { value: 1 }))
})
