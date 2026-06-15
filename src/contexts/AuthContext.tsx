import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types';
import { registerForPushNotifications } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the Firestore unsubscribe so we can clean it up on auth change
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous Firestore listener
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      // Listen in real-time so phone-auth new users get navigated to Home
      // the moment they save their name/profile in PhoneAuthScreen step 3.
      const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          setAppUser(snap.data() as AppUser);
          // Register/refresh push token each time the user's doc loads
          registerForPushNotifications(firebaseUser.uid);
        } else {
          setAppUser(null);
        }
        setLoading(false);
      });
      firestoreUnsubRef.current = unsub;
    });

    return () => {
      authUnsub();
      if (firestoreUnsubRef.current) firestoreUnsubRef.current();
    };
  }, []);

  async function signUp(email: string, password: string, displayName: string, phone?: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const newUser: AppUser = {
      id: cred.user.uid,
      displayName,
      email,
      phone: phone || '',
    };
    // The onSnapshot listener above will pick this up and set appUser
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newUser,
      createdAt: serverTimestamp(),
    });
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signUp, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
