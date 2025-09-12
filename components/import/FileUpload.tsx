// components/import/FileUpload.tsx - Updated for Modal Integration
'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { FileData, DetectedField } from '@/lib/types'
import { FieldMappingEngine } from '@/lib/fieldMapping'
import { useContactFields } from '@/hooks/useFirestore'
import { Upload, File, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface FileUploadProps {
  onFileUploaded: (data: FileData) => void
  onFieldsDetected: (fields: DetectedField[]) => void
  fileData: FileData | null
  onClose: () => void

}

export function FileUpload({ onFileUploaded, onFieldsDetected, fileData, onClose }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: contactFields } = useContactFields()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setCurrentTask('Reading file...')

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      let headers: string[] = []
      let rows: string[][] = []

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        setCurrentTask('Parsing Excel file...')

        // Read Excel file
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        if (jsonData.length > 0) {
          headers = jsonData[0] || []
          rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        }
      } else if (fileExtension === 'csv') {
        setCurrentTask('Parsing CSV file...')

        // Read CSV file
        const text = await file.text()
        const result = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        })

        if (result.data.length > 0) {
          headers = (result.data[0] as string[]) || []
          rows = (result.data.slice(1) as string[][]).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        }
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or Excel file.')
      }

      clearInterval(progressInterval)
      setProgress(95)
      setCurrentTask('Processing data...')

      // Validate file content
      if (!headers || headers.length === 0) {
        throw new Error('No headers found in the file. Please ensure the first row contains column headers.')
      }

      if (!rows || rows.length === 0) {
        throw new Error('No data rows found in the file. Please check your file content.')
      }

      // Clean headers (remove empty/null headers)
      const cleanHeaders = headers.filter(header => header && header.trim())
      if (cleanHeaders.length !== headers.length) {
        console.warn('Some headers were empty and have been filtered out')
      }

      // Create file data object
      const processedFileData: FileData = {
        headers: cleanHeaders,
        rows: rows.map(row => row.map(cell => cell ? String(cell).trim() : '')),
        fileName: file.name,
        fileSize: file.size
      }

      setProgress(100)
      setCurrentTask('File processed successfully!')

      // Call the callback
      onFileUploaded(processedFileData)

      // Start field detection process
      setTimeout(async () => {
        if (contactFields.length > 0) {
          setCurrentTask('AI Column Detection...')
          setProgress(0)

          // Simulate AI detection progress
          const detectionInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 15, 90))
          }, 300)

          try {
            const engine = new FieldMappingEngine(contactFields)
            const detected = engine.detectFields(processedFileData.headers, processedFileData.rows)

            clearInterval(detectionInterval)
            setProgress(100)
            setCurrentTask('Field detection complete!')

            setTimeout(() => {
              onFieldsDetected(detected)
              setIsProcessing(false)
            }, 500)

          } catch (detectionError) {
            clearInterval(detectionInterval)
            console.error('Field detection failed:', detectionError)
            // Still proceed even if detection fails
            onFieldsDetected([])
            setIsProcessing(false)
          }
        } else {
          setIsProcessing(false)
        }
      }, 1000)

    } catch (err) {
      setIsProcessing(false)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      console.error('File processing error:', err)
    }
  }, [onFileUploaded, onFieldsDetected, contactFields])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isProcessing
  })

  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-6 py-12"
      >
        {/* AI Detection Animation */}
        <div className="flex justify-center mb-6 bg-[url('/images/import/upload/processing.svg')] bg-center bg-cover bg-no-repeat rounded-full w-100 h-60 mx-auto">
          <Image
            src="/images/import/upload/sparkle.svg"
            alt="sparkle"
            width={160}
            height={160}
            className=""
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-blue-600 mb-2">
            Auto Detecting Field Mapping...
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Matching spreasheets columns to CRM fields using intelligent pattern recognition...          </p>
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{currentTask}</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 text-[#5883C9]" />
        </div>

        {fileData && (
          <Card className="max-w-md mx-auto">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">{fileData.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fileData.rows.length} rows • {fileData.headers.length} columns
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-start">
        <h3 className="text-xl font-semibold mb-2">Auto Detecting Field Mapping</h3>
        <p className="text-muted-foreground">
          Upload your CSV or Excel file to get started. Our AI will help detect and map your data fields automatically.
        </p>
      </div>

      {/* File Drop Zone */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer transition-all ${isDragActive ? 'bg-blue-50 border-blue-300' : ''
              }`}
          >
            <input {...getInputProps()} />

            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Upload className={`h-12 w-12 ${isDragActive ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Upload CSV or Excel File'}
              </p>
              <p className="text-sm text-gray-600">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports .csv, .xlsx, and .xls files up to 10MB
              </p>
            </div>

            <Button className="mt-4" disabled={isProcessing}>
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Format Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="px-4">
          <h4 className="font-medium text-blue-900 mb-2">File Requirements</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• First row must contain column headers</li>
            <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
            <li>• Maximum file size: 10MB</li>
            <li>• UTF-8 encoding recommended for CSV files</li>
          </ul>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={onClose} disabled={isProcessing}>
        Cancel
      </Button>
    </div>
  )
}