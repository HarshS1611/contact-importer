// components/import/ImportModal.tsx - Modal-based Import Wizard
'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from './FileUpload'
import { FieldMapping } from './FieldMapping'
import { ImportPreview } from './ImportPreview'
import { ImportResults } from './ImportResults'
import { FileData, DetectedField, FieldMapping as FieldMappingType, ImportResult, ImportStep } from '@/lib/types'
import { Upload, Search, MapPin, Eye, CheckCircle, ArrowLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/useFirestore'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    id: 'upload' as ImportStep,
    title: 'Detect Fields',
    description: 'Review data structure',
    icon: Search
  },
  {
    id: 'mapping' as ImportStep,
    title: 'Map Fields',
    description: 'Connect to CRM Fields',
    icon: MapPin
  },
  {
    id: 'final' as ImportStep,
    title: 'Final Checks',
    description: 'For Duplicates or Errors',
    icon: Eye
  }
]

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [mappings, setMappings] = useState<Record<string, FieldMappingType>>({})
  const [importResults, setImportResults] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { data: users, loading: usersLoading } = useUsers()

  const currentStepIndex = currentStep === 'upload' ? 0 : currentStep === 'mapping' ? 1 : 2

  const handleClose = () => {
    if (!isImporting) {
      // Reset all state when closing
      setCurrentStep('upload')
      setFileData(null)
      setDetectedFields([])
      setMappings({})
      setImportResults(null)
      setIsImporting(false)
      onClose()
    }
  }

    // Create user lookup for agent validation
    const userLookup = useMemo(() => {
      const lookup: Record<string, { id: string; name: string; email: string }> = {}
      if (users && Array.isArray(users)) {
        users.forEach(user => {
          if (user?.email && user?.id) {
            lookup[user.email.toLowerCase()] = {
              id: user.id, // Firebase document ID
              name: user.name || 'Unknown User',
              email: user.email
            }
          }
        })
      }
      return lookup
    }, [users])

  const validateMappings = () => {
    const errors: string[] = []
    
    const agentMapping = Object.values(mappings || {}).find(m => m.targetField === 'agentUid')
    if (agentMapping && fileData?.headers && fileData?.rows) {
      const columnIndex = fileData.headers.indexOf(agentMapping.name)
      if (columnIndex !== -1) {
        const sampleAgentEmails = fileData.rows
          .map(row => row && row[columnIndex] ? row[columnIndex] : '')
          .filter(email => email && email.trim())
          .map(email => email.toLowerCase().trim())
        
        const invalidEmails = sampleAgentEmails.filter(email => !userLookup[email])
        if (invalidEmails.length > 0) {
          errors.push(`Agent emails not found in users: ${invalidEmails.join(', ')}${invalidEmails.length > 3 ? '...' : ''}`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }


  const handleFileUploaded = (data: FileData) => {
    console.log('File uploaded:', data.fileName, 'with', data.rows.length, 'rows')
    setFileData(data)
    // Auto-advance to mapping step after detection completes
  }

  const handleFieldsDetected = (fields: DetectedField[]) => {
    console.log('Fields detected:', fields.length, 'fields')
    setDetectedFields(fields)
    setCurrentStep('mapping')
  }

  const handleMappingComplete = (fieldMappings: Record<string, FieldMappingType>) => {
    console.log('Mapping completed with', Object.keys(fieldMappings).length, 'mappings')
    setMappings(fieldMappings)
    const validation = validateMappings()
    console.log('Mapping validation result:', validation)
    
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    if (Object.keys(fieldMappings).length === 0) {
      toast.error('Please map at least one field before continuing')
      return
    }

    setCurrentStep('final')
  }

  const handleImportComplete = (results: ImportResult) => {
    console.log('Import completed:', results)
    setImportResults(results)
    setIsImporting(false)
    // Stay in modal to show results, user can close when ready
  }

  const handlePreviousStep = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload')
      setDetectedFields([])
      setMappings({})
    } else if (currentStep === 'final') {
      setCurrentStep('mapping')
    }
  }

  const getCurrentStepComponent = () => {
    if (importResults) {
      return (
        <ImportResults 
          results={importResults}
          fileData={fileData!}
          onClose={handleClose}
        />
      )
    }

    switch (currentStep) {
      case 'upload':
        return (
          <FileUpload 
            onFileUploaded={handleFileUploaded}
            onFieldsDetected={handleFieldsDetected}
            fileData={fileData}
          />
        )
      
      case 'mapping':
        return (
          <FieldMapping
            detectedFields={detectedFields}
            onMappingComplete={handleMappingComplete}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 'final':
        return (
          <ImportPreview
            fileData={fileData!}
            mappings={mappings}
            onImportComplete={handleImportComplete}
            onPrevious={handlePreviousStep}
            isImporting={isImporting}
            setIsImporting={setIsImporting}
          />
        )
      
      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Move Entry to Contact Section</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStep === 'upload' && 'Step 1 of 4'}
                {currentStep === 'mapping' && 'Step 2 of 4'}
                {currentStep === 'final' && 'Step 3 of 4'}
              </p>
            </div>
          </div>
          
          
        </DialogHeader>

        {/* Progress Steps */}
        {!importResults && (
          <div className="flex items-center justify-center gap-8 py-6 border-b">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                      ${isActive 
                        ? 'border-primary bg-primary text-white' 
                        : isCompleted 
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${
                        isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 max-w-[100px] text-center">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* File Info */}
        {fileData && !importResults && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Upload className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">{fileData.fileName}</span>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {fileData.rows.length} rows
            </Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {fileData.headers.length} columns
            </Badge>
            {Object.keys(mappings).length > 0 && (
              <Badge variant="outline" className="border-green-300 text-green-700">
                {Object.keys(mappings).length} mapped
              </Badge>
            )}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep + (importResults ? 'results' : '')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {getCurrentStepComponent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}