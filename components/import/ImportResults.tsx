// components/import/ImportResults.tsx - Final Results After Import
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImportResult, FileData } from '@/lib/types'
import { CheckCircle, AlertTriangle, Users, UserPlus, RefreshCw, X } from 'lucide-react'

interface ImportResultsProps {
  results: ImportResult
  fileData: FileData
  onClose: () => void
}

export function ImportResults({ results, fileData, onClose }: ImportResultsProps) {
  const hasErrors = results.errors && results.errors.length > 0
  const totalProcessed = results.created + results.updated + results.skipped
  const successRate = totalProcessed > 0 ? Math.round(((results.created + results.updated) / totalProcessed) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className={`p-4 rounded-full ${hasErrors ? 'bg-yellow-50' : 'bg-green-50'}`}>
          {hasErrors ? (
            <AlertTriangle className="h-16 w-16 text-yellow-600" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-600" />
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className={`text-2xl font-bold mb-2 ${hasErrors ? 'text-yellow-800' : 'text-green-800'}`}>
          {hasErrors ? 'Import Completed with Issues' : 'Import Successful!'}
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {hasErrors 
            ? 'Your contacts have been imported but some issues were found.'
            : 'Your contacts have been successfully imported and are now available in your database.'
          }
        </p>
      </div>

      {/* Results Summary Cards */}
      <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <UserPlus className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-3xl font-bold text-green-800">
              {results.created}
            </div>
            <div className="text-sm text-green-600 font-medium">New Contacts</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-3xl font-bold text-blue-800">
              {results.updated}
            </div>
            <div className="text-sm text-blue-600 font-medium">Merged</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <X className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-3xl font-bold text-orange-800">
              {results.skipped}
            </div>
            <div className="text-sm text-orange-600 font-medium">Skipped</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Details */}
      {hasErrors && (
        <Card className="border-red-200 bg-red-50 max-w-lg mx-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-800">Issues Found</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1 text-left">
              {results.errors.slice(0, 5).map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
              {results.errors.length > 5 && (
                <li className="text-red-600 italic">
                  ... and {results.errors.length - 5} more issues
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Import Summary */}
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Import Summary</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Processed:</span>
              <span className="font-semibold">{fileData.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rows:</span>
              <span className="font-semibold">{fileData.rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className={`font-semibold ${successRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {successRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deduplication:</span>
              <span className="font-semibold text-blue-600">Merge Mode</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {!hasErrors && (
        <Card className="border-green-200 bg-green-50 max-w-lg mx-auto">
          <CardContent className="p-4 text-center">
            <div className="text-green-800">
              <p className="font-semibold mb-1">All contacts imported successfully!</p>
              <p className="text-sm">
                Your contacts are now available in the main contacts view with proper agent assignments and merged duplicate data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Button */}
      <div className="flex justify-center pt-6">
        <Button size="lg" onClick={onClose} className="min-w-[200px]">
          <Users className="h-4 w-4 mr-2" />
          View Contacts
        </Button>
      </div>
    </motion.div>
  )
}