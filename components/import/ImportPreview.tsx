// components/import/ImportPreview.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileData, FieldMapping, ImportResult } from '@/lib/types'
import { FieldMappingEngine } from '@/lib/fieldMapping'
import { useContacts, useUsers, useContactFields } from '@/hooks/useFirestore'
import { CheckCircle, AlertTriangle, Shield, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ImportPreviewProps {
  fileData: FileData
  mappings: Record<string, FieldMapping>
  onImportComplete: (results: ImportResult) => void
  onPrevious: () => void
  isImporting: boolean
  setIsImporting: (importing: boolean) => void
}

interface PreviewSummary {
  willCreate: Array<Record<string, any>>
  willMerge: Array<{ contact: Record<string, any>, existing: any }>
  willSkip: Array<{ contact: Record<string, any>, reason: string }>
  errors: string[]
  invalidContacts: Array<{ contact: Record<string, any>; reason: string }>
}

export function ImportPreview({
  fileData,
  mappings,
  onImportComplete,
  onPrevious,
  isImporting,
  setIsImporting
}: ImportPreviewProps) {
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<'analyzing' | 'preview' | 'importing'>('analyzing')
  const [currentTask, setCurrentTask] = useState('')
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null)

  const { analyzeImport, importContacts, data: existingContacts } = useContacts()
  const { data: users } = useUsers()
  const { data: contactFields } = useContactFields()

  useEffect(() => {
    if (fileData && mappings && users.length > 0 && contactFields.length > 0 && existingContacts.length >= 0) {
      runAnalysisProcess()
    }
    // eslint-disable-next-line
  }, [fileData, mappings, users, contactFields, existingContacts])

  const runAnalysisProcess = async () => {
    setCurrentPhase('analyzing')
    setCurrentTask('Analyzing data for duplicates and errors...')
    setProgress(10)

    // Step 1: Map CSV data to contacts
    const engine = new FieldMappingEngine(contactFields)
    setCurrentTask('Processing all rows...')
    setProgress(20)

    // Map every row in fileData.rows to a normalized contact object
    const processedContacts = engine.processAllRowsForImport(
      fileData.headers,
      fileData.rows,
      mappings,
      users
    )
    console.log('Processed contacts:', processedContacts)

    setCurrentTask('Validating contact data...')
    setProgress(40)

    // Validate and split valid/invalid contacts
    const validContacts: Array<Record<string, any>> = []
    const invalidContacts: Array<{ contact: Record<string, any>; reason: string }> = []

    processedContacts.forEach(contact => {
      const hasRequiredData = contact.firstName || contact.lastName || contact.email || contact.phone
      if (!hasRequiredData) {
        invalidContacts.push({ contact, reason: 'Missing required data (name, email, or phone)' })
        return
      }
      if (contact.email && contact.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(contact.email.trim())) {
          invalidContacts.push({ contact, reason: 'Invalid email format' })
          return
        }
      }
      validContacts.push(contact)
    })

    setCurrentTask('Checking for duplicates...')
    setProgress(60)

    // Step 2: Use analyzeImport to classify create/merge/skip
    const mappedKeys = Object.values(mappings).map(m => m.targetField).filter(Boolean) as string[]
    const { willCreate, willMerge, willSkip } = analyzeImport(validContacts, existingContacts, mappedKeys)

    setCurrentTask('Analysis complete!')
    setProgress(100)

    const summary: PreviewSummary = {
      willCreate,
      willMerge,
      willSkip,
      errors: invalidContacts.map(ic => ic.reason),
      invalidContacts
    }

    setPreviewSummary(summary)
    setTimeout(() => {
      setCurrentPhase('preview')
    }, 400)
  }

  const handleActualImport = async () => {
    if (!previewSummary) return
    setIsImporting(true)
    setCurrentPhase('importing')
    setCurrentTask('Importing contacts to database...')
    setProgress(0)

    try {
      console.log('Starting import with summary:', previewSummary)
      const res = await importContacts(previewSummary, (pc) => setProgress(pc));

      const results = await res.unwrap()
      const importResults: ImportResult = {
        created: results.created,
        updated: results.updated,
        skipped: results.skipped + (previewSummary.errors?.length || 0),
        errors: [
          ...(previewSummary.errors || []),
          ...(results.errors || [])
        ]
      }

      console.log('Import completed with results:', importResults)
      setIsImporting(false)
      onImportComplete(importResults)
    } catch (error: any) {
      setIsImporting(false)
      onImportComplete({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [(error && error.message) || "Import failed"]
      })
    }
  }

  // PREVIEW RESULTS DISPLAY (BEFORE database save)
  if (currentPhase === 'preview' && previewSummary) {
    const { willCreate, willMerge, willSkip, errors } = previewSummary
    const hasErrors = errors.length > 0
    return (
      <div>
        <div className='max-h-[70vh] overflow-y-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-start">
              <h3 className="text-xl font-semibold text-[#0E4259] mb-2">Final Checks Complete</h3>
              <p className="text-[#68818C]">
                {hasErrors
                  ? 'Found some issues that need attention.'
                  : 'No duplicates or errors found — your data is clean and ready to import.'}
              </p>
            </div>

            <div className="flex justify-center bg-[url('/images/import/upload/processing.svg')] bg-center bg-cover bg-no-repeat rounded-full w-100 h-60 mx-auto">
              <Image
                src="/images/import/map/finalChecks.svg"
                alt="sparkle"
                width={160}
                height={160}
                className=""
              />
            </div>

            <div className='text-center'>
              {hasErrors ? <ul className="text-sm text-red-700 space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {errors.length > 5 && (
                  <li className="text-red-600 italic">
                    ... and {errors.length - 5} more
                  </li>
                )}
              </ul> : <p className='text-xl text-[#0E4259]'>No Issue Founds! This Database entres are good to move to contacts section.</p>}

            </div>
            {/* Results Preview Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-green-50 border-0">
                <CardContent className="px-2 text-center">
                  <div className="text-xs text-green-600 font-medium mb-2">Total Contacts Created</div>
                  <div className="text-4xl font-bold text-green-600">{willCreate.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-0">
                <CardContent className="px-2 text-center">
                  <div className="text-xs text-orange-600 font-medium mb-2">Contacts Merged</div>
                  <div className="text-4xl font-bold text-orange-600">{willMerge.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-0">
                <CardContent className="px-2 text-center">
                  <div className="text-xs text-blue-600 font-medium mb-2">Skipped</div>
                  <div className="text-4xl font-bold text-blue-600">{willSkip.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-0">
                <CardContent className="px-2 text-center">
                  <div className="text-xs text-red-600 font-medium mb-2">Errors</div>
                  <div className="text-4xl font-bold text-red-600">{errors.length}</div>
                </CardContent>
              </Card>
            </div>


          </motion.div>
        </div>
        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrevious} disabled={isImporting}>
            Previous
          </Button>
          <Button
            onClick={handleActualImport}
            disabled={isImporting || (willCreate.length === 0 && willMerge.length === 0)}
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Move to Contacts'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // LOADING/ANALYZING STATE
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-8"
    >
      <div className='text-start'>
        <h3 className="text-xl font-semibold text-[#0E4259] mb-2">
          Checking for Duplicates & Errors...
        </h3>
        <p className="text-[#68818C]">
          Reviewing the entry data to ensure no duplicate contacts or invalid data slip through.
        </p>
      </div>
      <div className="flex justify-center mb-8">
        <div className="flex justify-center bg-[url('/images/import/upload/processing.svg')] bg-center bg-cover bg-no-repeat rounded-full w-100 h-60 mx-auto">
          <Image
            src="/images/import/map/finalChecking.svg"
            alt="sparkle"
            width={160}
            height={160}
            className=""
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="text-lg font-semibold text-[#5883C9]">
          Running Final Checks...
        </div>
        <p className="text-[#7782AD] max-w-md mx-auto">
          {currentTask}
        </p>
      </div>
      <div className="max-w-md mx-auto space-y-2">
        <Progress value={progress} className="h-2 " />
        <div className="text-sm text-muted-foreground">
          {progress}% Complete
        </div>
      </div>
      <Card className="max-w-md mx-auto">
        <CardContent className="px-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Rows:</span>
              <span className="font-semibold">{fileData.rows.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fields Mapped:</span>
              <span className="font-semibold">{Object.keys(mappings).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-semibold text-blue-600">Analyzing</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
