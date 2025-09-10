// hooks/useFirestore.ts - Updated with toast.promise pattern
import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contact, User, ContactField } from '@/lib/types';
import { toast } from 'sonner';

export function useFirestore<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const collectionRef = collection(db, collectionName);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error loading ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
        toast.error(`Failed to load ${collectionName}: ${err.message}`);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  const add = async (item: Omit<T, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error adding to ${collectionName}:`, err);
      setError(errorMessage);
      throw err;
    }
  };

  const addWithCustomId = async (id: string, item: Omit<T, 'id'>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...item,
        createdAt: serverTimestamp()
      });
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error adding to ${collectionName} with ID ${id}:`, err);
      setError(errorMessage);
      throw err;
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    try {
      console.log(`Attempting to update document with ID: ${id} in collection: ${collectionName}`);

      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log(`Successfully updated document: ${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error updating ${collectionName} document ${id}:`, err);
      setError(errorMessage);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      console.log(`Attempting to delete document with ID: ${id} in collection: ${collectionName}`);

      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);

      console.log(`Successfully deleted document: ${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error deleting from ${collectionName} document ${id}:`, err);
      setError(errorMessage);
      throw err;
    }
  };

  const batchWrite = async (operations: Array<{
    type: 'add' | 'update' | 'delete';
    data?: any;
    id?: string;
  }>) => {
    const batch = writeBatch(db);
    const results: string[] = [];

    operations.forEach(op => {
      const docRef = op.id
        ? doc(db, collectionName, op.id)
        : doc(collection(db, collectionName));

      switch (op.type) {
        case 'add':
          batch.set(docRef, {
            ...op.data,
            createdAt: serverTimestamp()
          });
          results.push(docRef.id);
          break;
        case 'update':
          batch.update(docRef, {
            ...op.data,
            updatedAt: serverTimestamp()
          });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });

    await batch.commit();
    return results;
  };

  return {
    data,
    loading,
    error,
    add,
    addWithCustomId,
    update,
    remove,
    batchWrite
  };
}

// Enhanced contacts hook with toast.promise pattern
export function useContacts() {
  const baseHook = useFirestore<Contact>('contacts');

  const importContacts = async (
    contactsData: Array<Record<string, any>>,
    onProgress?: (progress: number, phase: string) => void,
    deduplicationMode: 'skip' | 'merge' = 'merge'
  ) => {
    // Create promise for toast.promise
    const importPromise = new Promise<{
      created: number;
      updated: number;
      skipped: number;
      errors: string[]
    }>(async (resolve, reject) => {
      try {
        console.log('=== Starting contact import ===');
        console.log('Contacts to import:', contactsData.length);
        console.log('Deduplication mode:', deduplicationMode);

      
        const batchResults = await importContactsWithBatching(contactsData, onProgress, deduplicationMode, baseHook);

        console.log('=== Individual import completed ===');
        console.log('Results:', batchResults);

        resolve(batchResults);

      } catch (error) {
        console.error('Import failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Import failed';
        reject(new Error(errorMessage));
      }
    });

    // Use toast.promise
    return toast.promise(importPromise, {
      loading: `Importing ${contactsData.length} contacts...`,
      success: (data) => {
        const totalProcessed = data.created + data.updated;
        if (totalProcessed === 0) {
          return 'No contacts were processed';
        }
        return `Successfully processed ${totalProcessed} contacts! ${data.created} created, ${data.updated} updated${data.skipped > 0 ? `, ${data.skipped} skipped` : ''}`;
      },
      error: (error) => `Import failed: ${error.message}`,
    });
  };

  // Helper function to merge contact data (skip blank overwrites)
  const mergeContactData = (existing: Contact, newData: Omit<Contact, 'id'>): Omit<Contact, 'id'> => {
    const merged = { ...existing };

    Object.keys(newData).forEach(key => {
      const newValue = newData[key as keyof typeof newData];
      const existingValue = existing[key as keyof Contact];

      if (newValue === null || newValue === undefined || newValue === '') {
        return;
      }

      if (existingValue === newValue) {
        return;
      }

      merged[key as keyof Contact] = newValue as any;
    });

    merged.updatedAt = new Date().toISOString();

    console.log(`Merged contact: existing fields kept, ${Object.keys(newData).length} fields processed`);

    return merged;
  };

  // Helper function to find existing contact
  const findExistingContact = async (email: string, phone: string): Promise<Contact | null> => {
    if (email && email.trim()) {
      const emailQuery = query(
        collection(db, 'contacts'),
        where('email', '==', email.trim().toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        const doc = emailSnapshot.docs[0];
        const contactData = { id: doc.id, ...doc.data() } as Contact;
        console.log(`📧 Found duplicate by email: ${email} -> ${contactData.id}`);
        return contactData;
      }
    }

    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const phoneQuery = query(
          collection(db, 'contacts'),
          where('phone', '==', phone.trim())
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
          const doc = phoneSnapshot.docs[0];
          const contactData = { id: doc.id, ...doc.data() } as Contact;
          console.log(`📱 Found duplicate by phone: ${phone} -> ${contactData.id}`);
          return contactData;
        }
      }
    }

    return null;
  };

  return {
    ...baseHook,
    importContacts
  };
}

// Batch processing helper
const importContactsWithBatching = async (
  contactsData: Array<Record<string, any>>,
  onProgress: ((progress: number, phase: string) => void) | undefined,
  deduplicationMode: 'skip' | 'merge',
  baseHook: ReturnType<typeof useFirestore<Contact>>
) => {
  console.log('=== Starting HIGH VOLUME batch import ===');

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  const batchSize = 25;
  const totalBatches = Math.ceil(contactsData.length / batchSize);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = contactsData.slice(
      batchIndex * batchSize,
      (batchIndex + 1) * batchSize
    );
    const operations: Array<{
      type: 'add';
      data: Contact;
    }> = [];

    for (const contactData of batch) {
      try {
        const existingContact = await findExistingContact(contactData.email, contactData.phone);
        const processedContact: Omit<Contact, 'id'> = {
          firstName: contactData.firstName || '',
          lastName: contactData.lastName || '',
          phone: contactData.phone || '',
          email: contactData.email || '',
          agentUid: contactData.agentUid || '',
          createdOn: contactData.createdOn || new Date().toISOString(),
          ...Object.keys(contactData)
            .filter(key => !['id', 'firstName', 'lastName', 'phone', 'email', 'agentUid', 'createdOn'].includes(key))
            .reduce((acc, key) => {
              acc[key] = contactData[key];
              return acc;
            }, {} as Record<string, any>)
        };

        if (existingContact) {
          if (deduplicationMode === 'skip') {
            results.skipped++;
            console.log(`⏭️ Skipping duplicate: ${processedContact.firstName} ${processedContact.lastName}`);
          } else {
            const mergedContact = mergeContactData(existingContact, processedContact);
            await baseHook.update(existingContact.id, mergedContact);
            results.updated++;
          }
        } else {
          operations.push({
            type: 'add',
            data: processedContact as Contact
          });
          results.created++;
        }
      } catch (contactError) {
        console.error('Error processing contact:', contactError);
        results.errors.push(`Error processing ${contactData.firstName} ${contactData.lastName}: ${contactError}`);
        results.skipped++;
      }
    }

    if (operations.length > 0) {
      try {
        await baseHook.batchWrite(operations as any);
        console.log(`✅ Batch ${batchIndex + 1} completed (${operations.length} operations)`);
      } catch (batchError) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, batchError);
        results.errors.push(`Batch ${batchIndex + 1} failed: ${batchError}`);
      }
    }

    const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
    onProgress?.(progress, 'importing');

    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
};

// Helper functions
const findExistingContact = async (email: string, phone: string): Promise<Contact | null> => {
  if (email && email.trim()) {
    const emailQuery = query(
      collection(db, 'contacts'),
      where('email', '==', email.trim().toLowerCase())
    );
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      const doc = emailSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Contact;
    }
  }

  if (phone && phone.trim()) {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const phoneQuery = query(
        collection(db, 'contacts'),
        where('phone', '==', phone.trim())
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        const doc = phoneSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Contact;
      }
    }
  }

  return null;
};

const mergeContactData = (existing: Contact, newData: Omit<Contact, 'id'>): Omit<Contact, 'id'> => {
  const merged = { ...existing };

  Object.keys(newData).forEach(key => {
    const newValue = newData[key as keyof typeof newData];
    const existingValue = existing[key as keyof Contact];

    if (newValue === null || newValue === undefined || newValue === '') {
      return;
    }

    if (existingValue === newValue) {
      return;
    }

    merged[key as keyof Contact] = newValue as any;
  });

  merged.updatedAt = new Date().toISOString();

  return merged;
};

// UPDATED: Users hook with toast.promise pattern
export function useUsers() {
  const result = useFirestore<User>('users');

  // Updated createUser with toast.promise
  const createUser = async (userData: Omit<User, 'id'>) => {
    const createPromise = new Promise<{ id: string; name: string }>(async (resolve, reject) => {
      try {
        console.log('Creating user:', userData);

        const docId = await result.add(userData);

        console.log(`Created user "${userData.name}" with Firebase ID: ${docId}`);
        resolve({ id: docId, name: userData.name });
      } catch (error) {
        console.error('Error creating user:', error);
        reject(error);
      }
    });

    return toast.promise(createPromise, {
      loading: `Creating user ${userData.name}...`,
      success: (data) => `Successfully created ${data.name} (Agent ID: ${data.id.substring(0, 8)}...)`,
      error: (error) => `Failed to create user: ${error.message}`,
    });
  };

  // Updated updateUser with toast.promise
  const updateUser = async (userId: string, userData: Partial<User>, userName: string) => {
    const updatePromise = new Promise<string>(async (resolve, reject) => {
      try {
        await result.update(userId, userData);
        resolve(userName);
      } catch (error) {
        reject(error);
      }
    });

    return toast.promise(updatePromise, {
      loading: `Updating ${userName}...`,
      success: (name) => `Successfully updated ${name}`,
      error: (error) => `Failed to update user: ${error.message}`,
    });
  };

  // Updated deleteUser with toast.promise
  const deleteUser = async (userId: string, userName: string) => {
    const deletePromise = new Promise<string>(async (resolve, reject) => {
      try {
        await result.remove(userId);
        resolve(userName);
      } catch (error) {
        reject(error);
      }
    });

    return toast.promise(deletePromise, {
      loading: `Deleting ${userName}...`,
      success: (name) => `Successfully deleted ${name}`,
      error: (error) => `Failed to delete user: ${error.message}`,
    });
  };

  const findUserByEmail = (email: string): User | undefined => {
    return result.data.find(user =>
      user.email.toLowerCase() === email.toLowerCase()
    );
  };

  const findUserById = (agentUid: string): User | undefined => {
    return result.data.find(user => user.id === agentUid);
  };

  return {
    ...result,
    createUser,
    updateUser,
    deleteUser,
    findUserByEmail,
    findUserById
  };
}

// Contact Fields hook with toast.promise pattern
export function useContactFields() {
  const result = useFirestore<ContactField>('contactFields');

  useEffect(() => {
    if (!result.loading && result.data.length === 0) {
      const defaultFields = [
        { id: 'firstName', label: 'First Name', type: 'text' as const, core: true, required: false },
        { id: 'lastName', label: 'Last Name', type: 'text' as const, core: true, required: false },
        { id: 'email', label: 'Email', type: 'email' as const, core: true, required: false },
        { id: 'phone', label: 'Phone', type: 'phone' as const, core: true, required: false },
        { id: 'agentUid', label: 'Assigned Agent', type: 'text' as const, core: true, required: false },
        { id: 'createdOn', label: 'Created Date', type: 'datetime' as const, core: true, required: false },
      ];

      defaultFields.forEach(field => {
        console.log(`Creating default field with ID: ${field.id}`);
        result.addWithCustomId(field.id, field).catch(console.error);
      });

      if (defaultFields.length > 0) {
        toast.info(`Initialized ${defaultFields.length} default contact fields`);
      }
    }
  }, [result.loading, result.data.length, result]);

  // Updated createCustomField with toast.promise
  const createCustomField = async (fieldData: Omit<ContactField, 'id'>) => {
    const createPromise = new Promise<{ id: string; label: string }>(async (resolve, reject) => {
      try {
        const fieldId = fieldData.label.toLowerCase().replace(/\s+/g, '_');
        console.log('Creating custom field with ID:', fieldId);

        const existingField = result.data.find(field => field.id === fieldId);
        if (existingField) {
          reject(new Error(`Field with ID "${fieldId}" already exists`));
          return;
        }

        const customField: ContactField = {
          ...fieldData,
          id: fieldId,
          core: false,
        };

        console.log('Saving custom field to database with document ID:', fieldId);

        const docId = await result.addWithCustomId(fieldId, customField);
        console.log('Custom field saved with document ID:', docId);

        resolve({ id: fieldId, label: fieldData.label });
      } catch (error) {
        console.error('Error creating custom field:', error);
        reject(error);
      }
    });

    return toast.promise(createPromise, {
      loading: `Creating field "${fieldData.label}"...`,
      success: (data) => `Successfully created field "${data.label}"`,
      error: (error) => `Failed to create field: ${error.message}`,
    });
  };

  // Updated updateField with toast.promise
  const updateField = async (fieldId: string, updates: Partial<ContactField>) => {
    const updatePromise = new Promise<string>(async (resolve, reject) => {
      try {
        console.log(`Updating field with ID: ${fieldId}`);

        const field = result.data.find(f => f.id === fieldId);
        if (!field) {
          reject(new Error(`Field with ID "${fieldId}" not found`));
          return;
        }

        if (field.core && updates.hasOwnProperty('core')) {
          reject(new Error('Cannot modify core field status'));
          return;
        }

        await result.update(fieldId, updates);
        resolve(field.label);
      } catch (error) {
        console.error('Error updating field:', error);
        reject(error);
      }
    });

    return toast.promise(updatePromise, {
      loading: 'Updating field...',
      success: (label) => `Successfully updated field "${label}"`,
      error: (error) => `Failed to update field: ${error.message}`,
    });
  };

  // Updated deleteField with toast.promise
  const deleteField = async (fieldId: string) => {
    const deletePromise = new Promise<string>(async (resolve, reject) => {
      try {
        console.log(`Deleting field with ID: ${fieldId}`);

        const field = result.data.find(f => f.id === fieldId);
        if (!field) {
          reject(new Error(`Field with ID "${fieldId}" not found`));
          return;
        }

        if (field.core) {
          reject(new Error('Cannot delete core fields'));
          return;
        }

        await result.remove(fieldId);
        resolve(field.label);
      } catch (error) {
        console.error('Error deleting field:', error);
        reject(error);
      }
    });

    return toast.promise(deletePromise, {
      loading: 'Deleting field...',
      success: (label) => `Successfully deleted field "${label}"`,
      error: (error) => `Failed to delete field: ${error.message}`,
    });
  };

  return {
    ...result,
    createCustomField,
    updateField,
    deleteField
  };
}