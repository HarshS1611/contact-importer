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
import { Upload, Search, MapPin, Eye, CheckCircle, ArrowLeft, X, Minus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/useFirestore'
import { FieldDetection } from './FieldDetection'
import Image from 'next/image'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    id: 'upload' as ImportStep,
    title: 'Detect Fields',
    description: 'Review data structure',
  },
  {
    id: 'mapping' as ImportStep,
    title: 'Map Fields',
    description: 'Connect to CRM Fields',
  },
  {
    id: 'final' as ImportStep,
    title: 'Final Checks',
    description: 'For Duplicates or Errors',
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

  const currentStepIndex = currentStep === 'upload' ? 0 : currentStep === 'mapping' || currentStep === 'detection' ? 1 : 2

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
          toast.info(`Agent emails not found in users: ${invalidEmails.join(', ')}${invalidEmails.length > 3 ? '...' : ''}`)
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
    console.log('Fields detected:', fields, 'fields')
    setDetectedFields(fields)
    setCurrentStep('detection')
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
      setCurrentStep('detection')
    } else if (currentStep === 'final') {
      setCurrentStep('mapping')
    } else if (currentStep === 'detection') {
      setCurrentStep('upload')
      setDetectedFields([])
      setMappings({})
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

      case 'detection':
        return (
          <FieldDetection
            detectedFields={detectedFields}
            setCurrentStep={setCurrentStep}
            onPrevious={handlePreviousStep}
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
      <DialogContent className="max-w-4xl min-h-[95%] overflow-y-auto">
        <DialogHeader className="relative items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg">
              <Image
                src="/images/import/step.svg"
                alt="sparkle"
                width={40}
                height={40}
                className=""
              />
            </div>
            <div>
              <DialogTitle className="text-lg text-[#0C5271]">Move Entry to Contact Section</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {currentStep === 'upload' && 'Step 1 of 4'}
                {currentStep === 'detection' && 'Step 1 of 4'}
                {currentStep === 'mapping' && 'Step 2 of 4'}
                {currentStep === 'final' && 'Step 3 of 4'}
              </p>
            </div>
          </div>

          <div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isImporting}
              className="absolute top-2 right-2 bg-[#F2F2F2]"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Steps */}
        {!importResults && (
          <div className="flex items-center justify-between gap-10 py-2 px-3 border-b">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex

              return (
                <div key={step.id} className="flex justify-center items-start">
                  <div className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-colors
                      ${isActive
                        ? 'border-primary bg-[#0E4259] text-white'
                        : isCompleted
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-[#EBF0F8] bg-[#EBF0F8] text-[#8C8DB0]'
                      }
                    `}>
                      {isCompleted ? (
                        <Check className="h-6 w-6 font-bold" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className=" text-start items-center ml-3">
                      <div className={`text-sm font-medium ${isActive && 'text-[#0E4259]'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-[#68818C] text-start">
                        {step.description}
                      </div>
                    </div>
                  </div>

                
                </div>
              )
            })}
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