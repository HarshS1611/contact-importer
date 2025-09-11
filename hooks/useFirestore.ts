// hooks/useFirestore.ts - Complete with toast.promise for all operations
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

  // TOAST.PROMISE wrapped add operation
  const add = (item: Omit<T, 'id'>, entityName?: string) => {
    const addPromise = addDoc(collection(db, collectionName), {
      ...item,
      createdAt: serverTimestamp()
    }).then(docRef => docRef.id);

    return toast.promise(addPromise, {
      loading: `Creating ${entityName || 'item'}...`,
      success: `Successfully created ${entityName || 'item'}`,
      error: (error) => `Failed to create ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped addWithCustomId operation
  const addWithCustomId = (id: string, item: Omit<T, 'id'>, entityName?: string) => {
    const addPromise = setDoc(doc(db, collectionName, id), {
      ...item,
      createdAt: serverTimestamp()
    }).then(() => id);

    return toast.promise(addPromise, {
      loading: `Creating ${entityName || 'item'} with ID ${id}...`,
      success: `Successfully created ${entityName || 'item'}`,
      error: (error) => `Failed to create ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped update operation
  const update = (id: string, updates: Partial<T>, entityName?: string) => {
    const updatePromise = updateDoc(doc(db, collectionName, id), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return toast.promise(updatePromise, {
      loading: `Updating ${entityName || 'item'}...`,
      success: `Successfully updated ${entityName || 'item'}`,
      error: (error) => `Failed to update ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped remove operation
  const remove = (id: string, entityName?: string) => {
    const removePromise = deleteDoc(doc(db, collectionName, id));

    return toast.promise(removePromise, {
      loading: `Deleting ${entityName || 'item'}...`,
      success: `Successfully deleted ${entityName || 'item'}`,
      error: (error) => `Failed to delete ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped batch operations
  const batchWrite = (
    operations: Array<{
      type: 'add' | 'update' | 'delete';
      data?: any;
      id?: string;
    }>,
    operationName?: string
  ) => {
    const batchPromise = (async () => {
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
    })();

    return toast.promise(batchPromise, {
      loading: `Processing ${operationName || 'batch operation'}...`,
      success: `Successfully completed ${operationName || 'batch operation'}`,
      error: (error) => `Failed ${operationName || 'batch operation'}: ${error.message}`,
    });
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

export function useContacts() {
  const baseHook = useFirestore<Contact>('contacts');

  /** Analyze data for preview */
  const analyzeImport = (
    contactsData: Array<Record<string, any>>,
    existingContacts: Contact[],
    mappedKeys: string[]
  ) => {
    const willCreate: Array<Record<string, any>> = [];
    const willMerge: Array<{ contact: Record<string, any>, existing: Contact }> = [];
    const willSkip: Array<{ contact: Record<string, any>, reason: string }> = [];

    for (const contact of contactsData) {
      if (mappedKeys.every((k) => !((contact[k] ?? '').toString().trim()))) {
        willSkip.push({ contact, reason: 'Empty row' });
        continue;
      }

      const existing = existingContacts.find(ex => (
        (contact.email && contact.email.trim() && ex.email?.toLowerCase() === contact.email.trim().toLowerCase()) ||
        (contact.phone && contact.phone.trim() && ex.phone?.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''))
      ));

      if (!existing) {
        willCreate.push(contact);
      } else {
        const identical = mappedKeys.every((k) =>
          ((contact[k] ?? '').toString().trim() === (existing[k] ?? '').toString().trim())
        );
        if (identical) {
          willSkip.push({ contact, reason: 'Identical to existing' });
        } else {
          willMerge.push({ contact, existing });
        }
      }
    }

    return { willCreate, willMerge, willSkip };
  };

  /**
   * TOAST.PROMISE wrapped import contacts
   */
  const importContacts = (
    actions: ReturnType<typeof analyzeImport>,
    onProgress?: (percent: number, phase: string) => void
  ) => {
    const importPromise = (async () => {
      let created = 0, updated = 0, skipped = actions.willSkip.length;
      const errors: string[] = [];

      // Create new contacts
      onProgress?.(10, 'Creating new contacts...');
      for (const [index, contact] of actions.willCreate.entries()) {
        try {
          await baseHook.add(contact, `Contact ${index + 1}`);
          created++;
          onProgress?.(10 + (index / actions.willCreate.length) * 40, 'Creating contacts...');
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Unknown error';
          errors.push(`Create failed: ${error}`);
        }
      }

      // Merge existing contacts
      onProgress?.(50, 'Merging existing contacts...');
      for (const [index, { contact, existing }] of actions.willMerge.entries()) {
        try {
          const merged = { ...existing };
          Object.keys(contact).forEach(key => {
            const n = (contact[key] ?? '').toString().trim();
            if (n && n !== (existing[key] ?? '').toString().trim()) merged[key] = n;
          });
          await baseHook.update(existing.id, merged, `Contact ${existing.firstName} ${existing.lastName}`);
          updated++;
          onProgress?.(50 + (index / actions.willMerge.length) * 40, 'Merging contacts...');
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Unknown error';
          errors.push(`Merge failed: ${error}`);
        }
      }

      onProgress?.(100, 'Import complete!');
      return { created, updated, skipped, errors };
    })();

    return toast.promise(importPromise, {
      loading: `Importing ${actions.willCreate.length + actions.willMerge.length} contacts...`,
      success: (r) => `Import complete! ${r.created} created, ${r.updated} merged, ${r.skipped} skipped.`,
      error: (e) => `Import failed: ${e.message}`,
    });
  };

  return {
    ...baseHook,
    analyzeImport,
    importContacts
  };
}

export function useUsers() {
  const result = useFirestore<User>('users');

  const createUser = (userData: Omit<User, 'id'>) => {
    return result.add(userData, userData.name);
  };

  const updateUser = (userId: string, userData: Partial<User>, userName: string) => {
    return result.update(userId, userData, userName);
  };

  const deleteUser = (userId: string, userName: string) => {
    return result.remove(userId, userName);
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

      // Initialize default fields with toast
      defaultFields.forEach(field => {
        result.addWithCustomId(field.id, field, `Core field "${field.label}"`);
      });
    }
  }, [result.loading, result.data.length, result]);

  const createCustomField = (fieldData: Omit<ContactField, 'id'>) => {
    const fieldId = fieldData.label.toLowerCase().replace(/\s+/g, '_');
    
    const existingField = result.data.find(field => field.id === fieldId);
    if (existingField) {
      toast.error(`Field "${fieldData.label}" already exists`);
      return Promise.reject(new Error(`Field "${fieldData.label}" already exists`));
    }

    const customField: ContactField = {
      ...fieldData,
      id: fieldId,
      core: false,
    };

    return result.addWithCustomId(fieldId, customField, `Custom field "${fieldData.label}"`);
  };

  const updateField = (fieldId: string, updates: Partial<ContactField>) => {
    const field = result.data.find(f => f.id === fieldId);
    if (!field) {
      toast.error(`Field with ID "${fieldId}" not found`);
      return Promise.reject(new Error(`Field with ID "${fieldId}" not found`));
    }

    if (field.core && updates.hasOwnProperty('core')) {
      toast.error('Cannot modify core field status');
      return Promise.reject(new Error('Cannot modify core field status'));
    }

    return result.update(fieldId, updates, `Field "${field.label}"`);
  };

  const deleteField = (fieldId: string) => {
    const field = result.data.find(f => f.id === fieldId);
    if (!field) {
      toast.error(`Field with ID "${fieldId}" not found`);
      return Promise.reject(new Error(`Field with ID "${fieldId}" not found`));
    }

    if (field.core) {
      toast.error('Cannot delete core fields');
      return Promise.reject(new Error('Cannot delete core fields'));
    }

    return result.remove(fieldId, `Field "${field.label}"`);
  };

  return {
    ...result,
    createCustomField,
    updateField,
    deleteField
  };
}
