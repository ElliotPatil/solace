import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAD4jSNLjVkNui31_n-A3CY1OUWTwarPMs',
  authDomain: 'mysolacedatabase.firebaseapp.com',
  projectId: 'mysolacedatabase',
  storageBucket: 'mysolacedatabase.firebasestorage.app',
  messagingSenderId: '995492591508',
  appId: '1:995492591508:web:826862dea10256d6da8181',
}

export const firebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
export const firestore = getFirestore(firebaseApp)
export const firebaseStorage = getStorage(firebaseApp)

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
