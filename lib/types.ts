// lib/types.ts - UPDATED WITH CUSTOM FIELD SUPPORT
export interface ContactField {
  id: string
  label: string
  type: 'text' | 'number' | 'phone' | 'email' | 'datetime'
  core: boolean
}

export interface DetectedField {
  name: string
  confidence: number
  type: 'core' | 'custom'
  samples: string[]
  suggestedMapping?: string
}

export interface FieldMapping {
  name: string
  targetField: string
  confidence: number
  type: 'core' | 'custom'
  samples: string[]
}

export interface FileData {
  headers: string[]
  rows: string[][]
  fileName: string
  fileSize: number
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  agentUid: string
  createdOn: string
  // Allow additional custom fields
  [key: string]: any
}

export interface User {
  uid: string
  name: string
  email: string
  createdAt?: Date
  [key: string]: any
}

// Import wizard step types
export type ImportStep = 'upload' | 'detection' | 'mapping' | 'final'

export interface ImportWizardState {
  currentStep: ImportStep
  fileData: FileData | null
  detectedFields: DetectedField[]
  mappings: Record<string, FieldMapping>
  results: ImportResult | null
}

  export interface WizardStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    active: boolean;
  }