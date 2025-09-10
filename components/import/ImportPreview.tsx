// components/import/ImportPreview.tsx - Preview BEFORE Database Save
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileData, FieldMapping, ImportResult } from '@/lib/types'
import { FieldMappingEngine } from '@/lib/fieldMapping'
import { useContacts, useUsers, useContactFields } from '@/hooks/useFirestore'
import { CheckCircle, ArrowLeft, Users, UserPlus, FileX, AlertTriangle, Database, Loader2, Shield, Eye } from 'lucide-react'

interface ImportPreviewProps {
  fileData: FileData
  mappings: Record<string, FieldMapping>
  onImportComplete: (results: ImportResult) => void
  onPrevious: () => void
  isImporting: boolean
  setIsImporting: (importing: boolean) => void
}

interface PreviewSummary {
  willCreate: number
  willMerge: number
  willSkip: number
  errors: string[]
  validContacts: Array<Record<string, any>>
  duplicates: Array<{ contact: Record<string, any>; reason: string }>
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

  // Hooks for database operations
  const { importContacts, data: existingContacts } = useContacts()
  const { data: users } = useUsers()
  const { data: contactFields } = useContactFields()

  useEffect(() => {
    // Start analysis when component mounts
    if (fileData && mappings && users.length > 0 && contactFields.length > 0) {
      runAnalysisProcess()
    }
  }, [fileData, mappings, users, contactFields])

  const runAnalysisProcess = async () => {
    try {
      setCurrentPhase('analyzing')
      setCurrentTask('Analyzing data for duplicates and errors...')
      setProgress(10)

      // Initialize field mapping engine
      const engine = new FieldMappingEngine(contactFields)

      setCurrentTask('Processing all rows...')
      setProgress(20)

      // Process ALL rows for analysis
      const processedContacts = engine.processAllRowsForImport(
        fileData.headers,
        fileData.rows,
        mappings,
        users
      )

      setCurrentTask('Validating contact data...')
      setProgress(40)

      // Separate valid and invalid contacts
      const validContacts: Array<Record<string, any>> = []
      const invalidContacts: Array<{ contact: Record<string, any>; reason: string }> = []

      processedContacts.forEach(contact => {
        const hasRequiredData = contact.firstName || contact.lastName || contact.email || contact.phone
        
        if (!hasRequiredData) {
          invalidContacts.push({
            contact,
            reason: 'Missing required data (name, email, or phone)'
          })
          return
        }

        // Email validation if present
        if (contact.email && contact.email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(contact.email.trim())) {
            invalidContacts.push({
              contact,
              reason: 'Invalid email format'
            })
            return
          }
        }
        
        validContacts.push(contact)
      })

      setCurrentTask('Checking for duplicates...')
      setProgress(60)

      // Check for duplicates using existing contacts in memory
      const duplicates: Array<{ contact: Record<string, any>; reason: string }> = []
      const newContacts: Array<Record<string, any>> = []

      validContacts.forEach((contact, index) => {
        const isDuplicate = findDuplicateInMemory(contact, existingContacts)
        
        if (isDuplicate) {
          duplicates.push({
            contact,
            reason: isDuplicate.reason
          })
        } else {
          newContacts.push(contact)
        }
        
        // Update progress
        const currentProgress = 60 + ((index / validContacts.length) * 30)
        setProgress(Math.round(currentProgress))
      })

      setCurrentTask('Analysis complete!')
      setProgress(100)

      // Prepare preview summary
      const summary: PreviewSummary = {
        willCreate: newContacts.length,
        willMerge: duplicates.length, // Will be merged with existing
        willSkip: 0, // We don't skip in merge mode
        errors: invalidContacts.map(ic => ic.reason),
        validContacts: newContacts,
        duplicates,
        invalidContacts
      }

      console.log('Analysis results:', summary)
      setPreviewSummary(summary)

      // Move to preview phase
      setTimeout(() => {
        setCurrentPhase('preview')
      }, 500)

    } catch (error) {
      console.error('Analysis process failed:', error)
      
      setCurrentPhase('preview')
      
      // Show error state
      const errorSummary: PreviewSummary = {
        willCreate: 0,
        willMerge: 0,
        willSkip: 0,
        errors: [error instanceof Error ? error.message : 'Analysis failed'],
        validContacts: [],
        duplicates: [],
        invalidContacts: []
      }
      
      setPreviewSummary(errorSummary)
    }
  }

  // Helper function to find duplicates in memory
  const findDuplicateInMemory = (contact: Record<string, any>, existing: any[]): { reason: string } | null => {
    // Check by email first
    if (contact.email && contact.email.trim()) {
      const emailMatch = existing.find(existingContact => 
        existingContact.email?.toLowerCase() === contact.email.trim().toLowerCase()
      )
      if (emailMatch) {
        return { reason: `Duplicate email: ${contact.email}` }
      }
    }

    // Check by phone
    if (contact.phone && contact.phone.trim()) {
      const phoneMatch = existing.find(existingContact => 
        existingContact.phone?.trim() === contact.phone.trim()
      )
      if (phoneMatch) {
        return { reason: `Duplicate phone: ${contact.phone}` }
      }
    }

    return null
  }

  // ACTUAL IMPORT FUNCTION (called when user clicks "Move to Contacts")
  const handleActualImport = async () => {
    if (!previewSummary || (previewSummary.validContacts.length === 0 && previewSummary.duplicates.length === 0)) {
      console.error('No valid contacts to import')
      return
    }

    setIsImporting(true)
    setCurrentPhase('importing')
    setCurrentTask('Importing contacts to database...')
    setProgress(0)

    try {
      // Combine new contacts and duplicates for merge processing
      const allContactsToProcess = [...previewSummary.validContacts, ...previewSummary.duplicates.map(d => d.contact)]

      console.log('Contacts to import/merge:', allContactsToProcess)
      
      // Perform the actual import with merge mode (default)
      const importResults = await importContacts(
        allContactsToProcess,
        (importProgress, phase) => {
          setCurrentTask(`Saving contacts... ${importProgress}%`)
          setProgress(importProgress)
        },
        'merge' // Use merge mode to handle duplicates properly
      )

      console.log('Actual import results:',await importResults.unwrap())

      // Ensure importResults is of the correct type
      const results = await importResults.unwrap(); // Assuming importResults is a Promise-like object

      // Return final results
      const finalResults: ImportResult = {
        created: results.created,
        updated: results.updated,
        skipped: results.skipped + previewSummary.errors.length,
        errors: [
          ...previewSummary.errors,
          ...(Array.isArray(results.errors) ? results.errors : results.errors ? [results.errors] : [])
        ]
      }
      
      onImportComplete(finalResults)

    } catch (error) {
      console.error('Import failed:', error)
      setIsImporting(false)

      const errorResults: ImportResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Import failed']
      }
      
      onImportComplete(errorResults)
    }
  }

  // PREVIEW RESULTS DISPLAY (BEFORE database save)
  if (currentPhase === 'preview' && previewSummary) {
    const hasErrors = previewSummary.errors.length > 0
    const hasIssues = hasErrors || previewSummary.duplicates.length > 0
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Final Checks Complete</h3>
          <p className="text-muted-foreground">
            {hasErrors 
              ? 'Found some issues that need attention.'
              : 'No duplicates or errors found — your data is clean and ready to import.'
            }
          </p>
        </div>

        {/* Success Message */}
        {!hasIssues && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <div className="text-xl font-semibold text-green-800 mb-2">
                No Issue Found! This Database entries are good to move to contacts section.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Preview Cards - Match your image layout */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-green-50 border-0">
            <CardContent className="p-6 text-center">
              <div className="text-xs text-green-600 font-medium mb-2">Total Contacts Imported</div>
              <div className="text-4xl font-bold text-green-600">
                {previewSummary.willCreate}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-0">
            <CardContent className="p-6 text-center">
              <div className="text-xs text-orange-600 font-medium mb-2">Contacts Merged</div>
              <div className="text-4xl font-bold text-orange-600">
                {previewSummary.willMerge}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-0">
            <CardContent className="p-6 text-center">
              <div className="text-xs text-red-600 font-medium mb-2">Errors</div>
              <div className="text-4xl font-bold text-red-600">
                {previewSummary.errors.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Details */}
        {hasErrors && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-red-800">Issues Found</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {previewSummary.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {previewSummary.errors.length > 5 && (
                  <li className="text-red-600 italic">
                    ... and {previewSummary.errors.length - 5} more issues
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Duplicates Details */}
        {previewSummary.duplicates.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-orange-800">Duplicates Will Be Merged</span>
              </div>
              <div className="text-sm text-orange-700">
                Found {previewSummary.duplicates.length} contacts that already exist. 
                New information will be merged while preserving existing data.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrevious} disabled={isImporting}>
            Previous
          </Button>
          <Button 
            onClick={handleActualImport} 
            disabled={isImporting || (previewSummary.willCreate === 0 && previewSummary.willMerge === 0)}
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
      </motion.div>
    )
  }

  // LOADING/ANALYZING STATE
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-8"
    >
      <div>
        <h3 className="text-xl font-semibold mb-2">
          Checking for Duplicates & Errors...
        </h3>
        <p className="text-muted-foreground">
          Reviewing the entry data to ensure no duplicate contacts or invalid data slip through.
        </p>
      </div>

      {/* Progress Animation */}
      <div className="flex justify-center mb-8">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity }
          }}
          className="p-6 bg-primary/10 rounded-full"
        >
          <CheckCircle className="h-16 w-16 text-primary" />
        </motion.div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <div className="text-lg font-semibold text-primary">
          Running Final Checks...
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          {currentTask}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">
          {progress}% Complete
        </div>
      </div>

      {/* Processing Info */}
      <Card className="max-w-md mx-auto">
        <CardContent className="p-4">
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