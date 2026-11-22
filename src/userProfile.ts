import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from './firebase'
import type { User } from 'firebase/auth'

export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

/** Creates a profile on first sign-in and refreshes basic account details on later sign-ins. */
export async function ensureUserProfile(user: User): Promise<void> {
  const profileRef = doc(firestore, 'users', user.uid)
  const existing = await getDoc(profileRef)
  const profileData = {
    uid: user.uid,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  }

  await setDoc(
    profileRef,
    existing.exists()
      ? profileData
      : { ...profileData, createdAt: serverTimestamp() },
    { merge: true },
  )
}

/** Returns the signed-in user's profile, or null if it hasn't been created yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(firestore, 'users', uid)
  const snapshot = await getDoc(profileRef)
  return snapshot.exists() ? snapshot.data() as UserProfile : null
}
