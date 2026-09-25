import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  Timestamp, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  Timestamp, 
  addDoc, 
  updateDoc, 
  deleteDoc 
};
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, UserSale } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// User Sales Functions
export const submitUserSale = async (sale: Omit<UserSale, 'id' | 'createdAt' | 'status'>) => {
  console.log('submitUserSale started with data:', sale);
  try {
    console.log('Adding document to Firestore "user_sales"...');
    
    const docRef = await addDoc(collection(db, 'user_sales'), {
      ...sale,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    console.log('Firestore document created with ID:', docRef.id);
    return { id: docRef.id };
  } catch (error) {
    console.error('CRITICAL ERROR in submitUserSale:', error);
    handleFirestoreError(error, OperationType.CREATE, 'user_sales');
  }
};

export const updateUserSaleStatus = async (saleId: string, status: 'approved' | 'rejected') => {
  try {
    const saleRef = doc(db, 'user_sales', saleId);
    await updateDoc(saleRef, { status });
    
    if (status === 'approved') {
      const saleSnap = await getDoc(saleRef);
      if (saleSnap.exists()) {
        const saleData = saleSnap.data() as UserSale;
        // Also add to main products collection
        await addDoc(collection(db, 'products'), {
          name: saleData.name,
          category: saleData.category,
          price: saleData.price,
          unit: saleData.unit,
          image: saleData.image,
          description: saleData.description,
          stock: 1, // Default for user sales
          createdAt: serverTimestamp(),
          sellerId: saleData.userId,
          sellerPhone: saleData.phone || '',
          status: 'approved'
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `user_sales/${saleId}`);
  }
};

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth functions
export const registerWithEmail = async (email: string, password: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return await handleUserDoc(result.user);
};

export const loginWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return await handleUserDoc(result.user);
};

export const loginWithGoogle = async () => {
  try {
    // On mobile devices, popups are often blocked or problematic, so we prefer redirect
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('Mobile detected, using signInWithRedirect');
      await signInWithRedirect(auth, googleProvider);
      return null; // Redirect will happen, so we return null
    }

    // Try popup for desktop
    const result = await signInWithPopup(auth, googleProvider);
    return await handleUserDoc(result.user);
  } catch (error: any) {
    console.error('Login error:', error);
    // Fallback to redirect for any popup-related errors
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/popup-closed-by-user'
    ) {
      console.log('Popup failed, falling back to redirect');
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      throw error;
    }
  }
};

export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return await handleUserDoc(result.user);
    }
  } catch (error) {
    console.error('Redirect result error:', error);
  }
  return null;
};

const handleUserDoc = async (user: User) => {
  // Create/update user document
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      role: 'user', // Default role
      lastLogin: serverTimestamp()
    });
  } else {
    await setDoc(userRef, {
      lastLogin: serverTimestamp()
    }, { merge: true });
  }
  
  return user;
};
export const logout = async () => {
  await signOut(auth);
};

export const deleteOrder = async (orderId: string) => {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'orders/' + orderId);
  }
};

export const seedProducts = async (products: any[]) => {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    if (snapshot.empty) {
      console.log('Seeding products...');
      for (const product of products) {
        await setDoc(doc(db, 'products', product.id), product);
      }
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
};



export const updateProduct = async (productId: string, product: Partial<Omit<Product, 'id'>>) => {
  try {
    let imageUrl = product.image;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
        const storageRef = ref(storage, `products/${Date.now()}.jpg`);
        await uploadString(storageRef, imageUrl, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
    }
    
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...product,
      ...(imageUrl ? { image: imageUrl } : {})
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  try {
    let imageUrl = product.image;
    if (product.image.startsWith('data:image/')) {
        const storageRef = ref(storage, `products/${Date.now()}.jpg`);
        await uploadString(storageRef, product.image, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
    }
    
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...product,
      image: imageUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
  }
};

export const updateOrder = async (orderId: string, updates: Partial<any>) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
};

export const updateUserSaleImage = async (saleId: string, imageUrl: string) => {
  try {
    const saleRef = doc(db, 'user_sales', saleId);
    await updateDoc(saleRef, { image: imageUrl });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `user_sales/${saleId}`);
  }
};

export const updateLogoUrl = async (newUrl: string) => {
  try {
    const logoRef = doc(db, 'settings', 'logo');
    await setDoc(logoRef, { url: newUrl }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/logo');
  }
};

export const getLogoUrl = async () => {
  try {
    const logoRef = doc(db, 'settings', 'logo');
    const logoSnap = await getDoc(logoRef);
    if (logoSnap.exists()) {
      return logoSnap.data().url;
    }
    return null;
  } catch (error) {
    console.error('Error fetching logo:', error);
    return null;
  }
};

export type { User };
