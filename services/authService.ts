// services/authService.ts: Handles user registration, login, and profile management with Firebase Auth and Firestore
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../customTypes/types';

// Register a new user and create a Firestore profile
export async function registerUser(
  email: string, 
  password: string, 
  firstName: string,
  lastName: string,
  discipline: string = 'Engineer',
  community?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  // Create display name from first and last name
  const displayName = `${firstName} ${lastName}`;
  
  // Update Firebase Auth profile
  await updateProfile(firebaseUser, { displayName });
  
  // Create user profile in Firestore using our User interface
  const userData: Omit<User, 'id'> = {
    firstName,
    lastName,
    email,
    displayName,
    community,
    discipline,
    country: 'New Zealand', // Default value for country
    createdAt: serverTimestamp() as unknown as Date,
    updatedAt: serverTimestamp() as unknown as Date,
    isActive: true,
    role: 'user', // Default role
  };

  await setDoc(doc(db, 'users', firebaseUser.uid), userData);
  
  return {
    id: firebaseUser.uid,
    ...userData,
  } as User;
}

// Login an existing user
export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Get a user's Firestore profile
export async function getUserProfile(uid: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { id: uid, ...userDoc.data() } as User;
  }
  return null;
}

// Update a user's profile
export async function updateUserProfile(uid: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Get user by email (for sharing functionality)
export async function getUserByEmail(_email: string): Promise<User | null> {
  // Note: In a production app, you'd typically have a cloud function for this
  // to avoid exposing user emails. For now, this is a placeholder.
  console.warn('getUserByEmail should be implemented as a cloud function for security');
  return null;
}
