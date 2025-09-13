// hooks/useFirestore.ts - Enhanced with Transaction Support
import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  runTransaction,
  serverTimestamp,
  setDoc,
  query,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contact, User, ContactField } from '@/lib/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useFirestore<T>(collectionName: string) {
  const { user } = useAuth()
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const companyId = user.uid;
    const collectionRef = collection(db, `company/${companyId}/${collectionName}`);

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
  }, [collectionName, user]);

  // TOAST.PROMISE wrapped add operation
  const add = (item: Omit<T, 'id'>, entityName?: string, useToast: boolean = true) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;
    if (!useToast) {
      return addDoc(collection(db, `company/${companyId}/${collectionName}`), {
        ...item,
      }).then(docRef => docRef.id);
    }

    const addPromise = addDoc(collection(db, `company/${user.uid}/${collectionName}`), {
      ...item,
    }).then(docRef => docRef.id);

    return toast.promise(addPromise, {
      loading: `Creating ${entityName || 'item'}...`,
      success: `Successfully created ${entityName || 'item'}`,
      error: (error) => `Failed to create ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped addWithCustomId operation
  const addWithCustomId = (id: string, item: Omit<T, 'id'>, entityName?: string) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;
    const addPromise = setDoc(doc(db, `company/${companyId}/${collectionName}`, id), {
      ...item,
    }).then(() => id);

    return toast.promise(addPromise, {
      loading: `Creating ${entityName || 'item'} with ID ${id}...`,
      success: `Successfully created ${entityName || 'item'}`,
      error: (error) => `Failed to create ${entityName || 'item'}: ${error.message}`,
    });
  };

  // TOAST.PROMISE wrapped update operation
  const update = (id: string, updates: Partial<T>, entityName?: string, useToast: boolean = true) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;
    if (!useToast) {
      return updateDoc(doc(db, `company/${companyId}/${collectionName}`, id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
    const updatePromise = updateDoc(doc(db, `company/${companyId}/${collectionName}`, id), {
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
  const remove = (id: string, entityName?: string, useToast: boolean = true) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;
    if (!useToast) {
      return deleteDoc(doc(db, `company/${companyId}/${collectionName}`, id));
    }
    const removePromise = deleteDoc(doc(db, `company/${companyId}/${collectionName}`, id));

    return toast.promise(removePromise, {
      loading: `Deleting ${entityName || 'item'}...`,
      success: `Successfully deleted ${entityName || 'item'}`,
      error: (error) => `Failed to delete ${entityName || 'item'}: ${error.message}`,
    });
  };

  // 🔥 NEW: Transaction with retry logic
  const transactionWrite = async (
    operations: Array<{
      type: 'add' | 'update' | 'delete' | 'read';
      data?: any;
      id?: string;
      readCallback?: (docSnapshot: any) => void;
    }>,
    operationName?: string,
    maxRetries: number = 3
  ) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;
    const transactionPromise = async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await runTransaction(db, async (transaction) => {
            const results: string[] = [];

            // Phase 1: Handle all reads first (Firestore requirement)
            const readOperations = operations.filter(op => op.type === 'read');
            for (const op of readOperations) {
              if (op.id && op.readCallback) {
                const docRef = doc(db, `company/${companyId}/${collectionName}`, op.id);
                const docSnapshot = await transaction.get(docRef);
                op.readCallback(docSnapshot);
              }
            }

            // Phase 2: Handle all writes
            const writeOperations = operations.filter(op => op.type !== 'read');
            for (const op of writeOperations) {
              const docRef = op.id
                ? doc(db, `company/${companyId}/${collectionName}`, op.id)
                : doc(collection(db, `company/${companyId}/${collectionName}`));

              switch (op.type) {
                case 'add':
                  transaction.set(docRef, {
                    ...op.data,

                  });
                  results.push(docRef.id);
                  break;
                case 'update':
                  transaction.update(docRef, {
                    ...op.data,
                  });
                  break;
                case 'delete':
                  transaction.delete(docRef);
                  break;
              }
            }

            return results;
          });

          return result;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Transaction attempt ${attempt + 1} failed:`, error);

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      throw lastError || new Error('Transaction failed after all retries');
    };

    return toast.promise(transactionPromise(), {
      loading: `Processing ${operationName || 'transaction'}...`,
      success: `Successfully completed ${operationName || 'transaction'}`,
      error: (error) => `Failed ${operationName || 'transaction'}: ${error.message}`,
    });
  };

  // 🔧 Enhanced batch operations with transaction option
  const batchWrite = (
    operations: Array<{
      type: 'add' | 'update' | 'delete';
      data?: any;
      id?: string;
    }>,
    operationName?: string,
    options: {
      chunkSize?: number;
      useTransaction?: boolean;
      maxRetries?: number;
    } = {}
  ) => {
    const {
      chunkSize = 500,
      useTransaction = false,
      maxRetries = 3
    } = options;

    if (!user) {
      const errorMsg = 'User not authenticated';
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const companyId = user.uid;

    // If using transaction and operations are within limit, use transaction
    if (useTransaction && operations.length <= 500) {
      return transactionWrite(operations, operationName, maxRetries);
    }

    // Otherwise use batch processing
    const batchPromise = (async () => {
      const chunks = [];
      for (let i = 0; i < operations.length; i += chunkSize) {
        chunks.push(operations.slice(i, i + chunkSize));
      }

      const results: string[] = [];
      const errors: string[] = [];

      for (const [chunkIndex, chunk] of chunks.entries()) {
        try {
          if (useTransaction && chunk.length <= 500) {
            // Use transaction for this chunk
            const chunkResults = await transactionWrite(
              chunk,
              `${operationName} chunk ${chunkIndex + 1}`,
              maxRetries
            );
            results.push(...(await chunkResults.unwrap() || []));
          } else {
            // Use batch for this chunk
            const batch = writeBatch(db);

            chunk.forEach(op => {
              const docRef = op.id
                ? doc(db, `company/${companyId}/${collectionName}`, op.id)
                : doc(collection(db, `company/${companyId}/${collectionName}`));

              switch (op.type) {
                case 'add':
                  batch.set(docRef, {
                    ...op.data,

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
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Chunk ${chunkIndex + 1} failed: ${errorMessage}`);
          console.error(`Batch chunk ${chunkIndex + 1} failed:`, error);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Some operations failed: ${errors.join('; ')}`);
      }

      return results;
    })();

    return toast.promise(batchPromise, {
      loading: `Processing ${operationName || 'batch operation'}...`,
      success: `Successfully completed ${operationName || 'batch operation'}`,
      error: (error) => `Failed ${operationName || 'batch operation'}: ${error.message}`,
    });
  };

  // 🔥 NEW: Atomic batch write (ensures all or nothing)
  const atomicBatchWrite = (
    operations: Array<{
      type: 'add' | 'update' | 'delete';
      data?: any;
      id?: string;
    }>,
    operationName?: string
  ) => {
    if (operations.length > 500) {
      return Promise.reject(new Error('Atomic operations cannot exceed 500 items. Use regular batchWrite for larger operations.'));
    }

    return batchWrite(operations, operationName, {
      useTransaction: true,
      chunkSize: 500,
      maxRetries: 3
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
    batchWrite,
    transactionWrite,
    atomicBatchWrite
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
   * 🔥 Enhanced import with transaction support
   */
  const importContacts = (
    actions: ReturnType<typeof analyzeImport>,
    options: {
      onProgress?: (percent: number, phase: string) => void;
      useTransaction?: boolean;
      chunkSize?: number;
      atomic?: boolean;
    } = {}
  ) => {
    const {
      onProgress,
      useTransaction = false,
      chunkSize = 100,
      atomic = false
    } = options;

    const importPromise = (async () => {
      let created = 0, updated = 0, skipped = actions.willSkip.length;
      const errors: string[] = [];

      // If atomic is requested and total operations <= 500, use single transaction
      const totalOperations = actions.willCreate.length + actions.willMerge.length;
      if (atomic && totalOperations <= 500) {
        onProgress?.(10, 'Preparing atomic import...');

        const allOperations = [
          ...actions.willCreate.map(contact => ({
            type: 'add' as const,
            data: {
              ...contact,
            }
          })),
          ...actions.willMerge.map(({ contact, existing }) => {
            const merged = { ...existing };
            Object.keys(contact).forEach(key => {
              const newValue = (contact[key] ?? '').toString().trim();
              if (newValue && newValue !== (existing[key] ?? '').toString().trim()) {
                merged[key] = newValue;
              }
            });
            return {
              type: 'update' as const,
              id: existing.id,
              data: merged
            };
          })
        ];

        try {
          await baseHook.atomicBatchWrite(allOperations, 'Atomic contact import');
          created = actions.willCreate.length;
          updated = actions.willMerge.length;
          onProgress?.(100, 'Atomic import complete!');
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Unknown error';
          errors.push(`Atomic import failed: ${error}`);
        }
      } else {
        // Regular chunked processing
        onProgress?.(10, 'Creating new contacts...');
        for (let i = 0; i < actions.willCreate.length; i += chunkSize) {
          const chunk = actions.willCreate.slice(i, i + chunkSize);
          const operations = chunk.map(contact => ({
            type: 'add' as const,
            data: {
              ...contact,
            }
          }));

          try {
            await baseHook.batchWrite(
              operations,
              `Contacts batch ${Math.floor(i / chunkSize) + 1}`,
              { useTransaction, chunkSize: 500 }
            );
            created += chunk.length;
            onProgress?.(10 + (i / actions.willCreate.length) * 40, 'Creating contacts...');
          } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            errors.push(`Batch create failed: ${error}`);
          }
        }

        // Merge existing contacts in chunks
        onProgress?.(50, 'Merging existing contacts...');
        for (let i = 0; i < actions.willMerge.length; i += chunkSize) {
          const chunk = actions.willMerge.slice(i, i + chunkSize);
          const operations = chunk.map(({ contact, existing }) => {
            const merged = { ...existing };
            Object.keys(contact).forEach(key => {
              const newValue = (contact[key] ?? '').toString().trim();
              if (newValue && newValue !== (existing[key] ?? '').toString().trim()) {
                merged[key] = newValue;
              }
            });
            return {
              type: 'update' as const,
              id: existing.id,
              data: merged
            };
          });

          try {
            await baseHook.batchWrite(
              operations,
              `Merge batch ${Math.floor(i / chunkSize) + 1}`,
              { useTransaction, chunkSize: 500 }
            );
            updated += chunk.length;
            onProgress?.(50 + (i / actions.willMerge.length) * 40, 'Merging contacts...');
          } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            errors.push(`Batch merge failed: ${error}`);
          }
        }
      }

      onProgress?.(100, 'Import complete!');
      return {
        created,
        updated,
        skipped,
        errors,
        totalOperations
      };
    })();

    return toast.promise(importPromise, {
      loading: `Importing ${actions.willCreate.length + actions.willMerge.length} contacts${atomic ? ' (atomic)' : ''}...`,
      success: (r) => `Import complete! ${r.created} created, ${r.updated} merged, ${r.skipped} skipped${r.errors.length > 0 ? ` (${r.errors.length} errors)` : ''}.`,
      error: (e) => `Import failed: ${e.message}`,
    });
  };

  // 🔥 NEW: Atomic import (all or nothing)
  const atomicImportContacts = (
    actions: ReturnType<typeof analyzeImport>,
    onProgress?: (percent: number, phase: string) => void
  ) => {
    const totalOperations = actions.willCreate.length + actions.willMerge.length;

    if (totalOperations > 500) {
      return Promise.reject(new Error(`Atomic import cannot exceed 500 operations. Current: ${totalOperations}. Use regular import for larger datasets.`));
    }

    return importContacts(actions, {
      onProgress,
      atomic: true,
      useTransaction: true
    });
  };

  return {
    ...baseHook,
    analyzeImport,
    importContacts,
    atomicImportContacts
  };
}

export function useUsers() {
  const result = useFirestore<User>('users');
  const { user } = useAuth()
  if (!user?.uid) {
    const errorMsg = 'User not authenticated';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }
  const companyId = user?.uid;
  const createUser = async (userData: Omit<User, 'id'>) => {
    const unique = await isEmailUnique(userData.email, companyId);
    if (!unique) {
      toast.error('User with this email already exists');
      throw new Error('User with this email already exists');
    }
    return result.add(userData);
  };

  const updateUser = (userId: string, userData: Partial<User>, userName: string) => {
    return result.update(userId, userData, userName);
  };

  const deleteUser = (userId: string, userName: string) => {
    return result.remove(userId, userName);
  };

  const isEmailUnique = async (email: string, companyId: string) => {

    const q = query(collection(db, `company/${companyId}/users`), where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty; 
  }

  return {
    ...result,
    createUser,
    updateUser,
    deleteUser,
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

      // Initialize default fields atomically
      const operations = defaultFields.map(field => ({
        type: 'add' as const,
        id: field.id,
        data: field
      }));

      result.atomicBatchWrite(operations, 'Initialize core fields');
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
