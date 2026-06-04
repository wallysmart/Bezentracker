import { db, auth } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  writeBatch
} from "firebase/firestore";
import { RecordRow, AppUser } from "../types";

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Records Operations
export async function getRecordsDirect(): Promise<RecordRow[]> {
  const path = "records";
  try {
    const q = query(collection(db, path), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const records: RecordRow[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as RecordRow);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveRecordDirect(record: RecordRow): Promise<void> {
  const path = `records/${record.id}`;
  try {
    await setDoc(doc(db, "records", record.id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRecordDirect(recordId: string): Promise<void> {
  const path = `records/${recordId}`;
  try {
    await deleteDoc(doc(db, "records", recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllRecordsDirect(): Promise<void> {
  const path = "records";
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 2. Settings: Prices
export async function getPricesDirect(): Promise<Record<string, number> | null> {
  const path = "settings/prices";
  try {
    const docSnap = await getDoc(doc(db, "settings", "prices"));
    if (docSnap.exists()) {
      return docSnap.data() as Record<string, number>;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function savePricesDirect(prices: Record<string, number>): Promise<void> {
  const path = "settings/prices";
  try {
    await setDoc(doc(db, "settings", "prices"), prices);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3. Settings: Correspondences
export async function getCorrespondencesDirect(): Promise<Record<string, number> | null> {
  const path = "settings/correspondences";
  try {
    const docSnap = await getDoc(doc(db, "settings", "correspondences"));
    if (docSnap.exists()) {
      return docSnap.data() as Record<string, number>;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveCorrespondencesDirect(correspondences: Record<string, number>): Promise<void> {
  const path = "settings/correspondences";
  try {
    await setDoc(doc(db, "settings", "correspondences"), correspondences);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3b. Settings: Strawberry Varieties (aardbeirassen)
export async function getStrawberryVarietiesDirect(): Promise<string[]> {
  const path = "settings/strawberryVarieties";
  try {
    const docSnap = await getDoc(doc(db, "settings", "strawberryVarieties"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.varieties)) {
        return data.varieties;
      }
    }
    return ["Sonsation", "Karima", "Lady Emma", "Elsanta", "Sonata", "Korona", "Polka"];
  } catch (error) {
    // Return defaults gracefully even on error
    console.warn("Fout ophalen direct aardbeirassen, gebruik defaults:", error);
    return ["Sonsation", "Karima", "Lady Emma", "Elsanta", "Sonata", "Korona", "Polka"];
  }
}

export async function saveStrawberryVarietiesDirect(varieties: string[]): Promise<void> {
  const path = "settings/strawberryVarieties";
  try {
    await setDoc(doc(db, "settings", "strawberryVarieties"), { varieties: varieties.map(v => v.trim()).filter(Boolean) });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Google Drive Settings Helpers
export async function getGDriveFolderDirect(): Promise<{ folderId: string } | null> {
  const path = "settings/gdrive";
  try {
    const docSnap = await getDoc(doc(db, "settings", "gdrive"));
    if (docSnap.exists()) {
      return docSnap.data() as { folderId: string };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveGDriveFolderDirect(folderId: string): Promise<void> {
  const path = "settings/gdrive";
  try {
    await setDoc(doc(db, "settings", "gdrive"), { folderId: folderId.trim() });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Users Administration
export async function getUsersDirect(): Promise<AppUser[]> {
  const path = "users";
  try {
    const snapshot = await getDocs(collection(db, path));
    const users: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      users.push(docSnap.data() as AppUser);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserDirect(user: AppUser): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, "users", user.uid), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserStatusDirect(uid: string, status: "pending" | "approved" | "rejected"): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserDirect(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 5. Admins Collection
export async function getAdminsDirect(): Promise<string[]> {
  const path = "admins";
  try {
    const snapshot = await getDocs(collection(db, path));
    const admins: string[] = [];
    snapshot.forEach((docSnap) => {
      admins.push(docSnap.id);
    });
    return admins;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveAdminDirect(email: string): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const path = `admins/${normEmail}`;
  try {
    await setDoc(doc(db, "admins", normEmail), { email: normEmail });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminDirect(email: string): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const path = `admins/${normEmail}`;
  try {
    await deleteDoc(doc(db, "admins", normEmail));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
