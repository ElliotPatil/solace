import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { firestore } from './firebase'
import type { User } from 'firebase/auth'

export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt?: unknown
  lastLoginAt?: unknown
  updatedAt?: unknown
}

export type AccountResolution = 'created' | 'existing'

/**
 * Resolves a Firebase UID to its account profile.
 * A transaction prevents simultaneous sign-ins from creating duplicate profiles
 * and ensures createdAt is only written during initial account creation.
 */
export async function ensureUserProfile(user: User): Promise<AccountResolution> {
  const profileRef = doc(firestore, 'users', user.uid)

  return runTransaction(firestore, async transaction => {
    const existing = await transaction.get(profileRef)
    const profileData = {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (existing.exists()) {
      transaction.set(profileRef, profileData, { merge: true })
      return 'existing'
    }

    transaction.set(profileRef, {
      ...profileData,
      createdAt: serverTimestamp(),
    })
    return 'created'
  })
}

/** Returns the signed-in user's profile, or null if it hasn't been created yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(firestore, 'users', uid)
  const snapshot = await getDoc(profileRef)
  return snapshot.exists() ? snapshot.data() as UserProfile : null
}
