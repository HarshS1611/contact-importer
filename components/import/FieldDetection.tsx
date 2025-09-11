// components/import/FieldMapping.tsx - UPDATED WITH CUSTOM FIELD CREATION
'use client'

import { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DetectedField, FieldMapping as FieldMappingType, ContactField, ImportStep } from '@/lib/types'
import { useContactFields, useUsers } from '@/hooks/useFirestore'
import { CustomFieldModal } from './CustomFieldModal'
import { ArrowRight, ArrowLeft, RotateCcw, Settings, AlertTriangle, Edit, Check, X, Plus, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface FieldMappingProps {
  detectedFields: DetectedField[]
  onPrevious: () => void
  setCurrentStep: Dispatch<SetStateAction<ImportStep>>
}

export function FieldDetection({ detectedFields, setCurrentStep, onPrevious }: FieldMappingProps) {
  const { data: contactFields, loading: fieldsLoading } = useContactFields()
  const [mappings, setMappings] = useState<Record<string, FieldMappingType>>({})

  // Initialize mappings from detected fields
  useEffect(() => {
    if (!fieldsLoading && contactFields.length > 0) {
      const initialMappings: Record<string, FieldMappingType> = {}
      detectedFields.forEach(field => {
        if (field.suggestedMapping && field.confidence > 50) {
          initialMappings[field.name] = {
            name: field.name,
            targetField: field.suggestedMapping,
            confidence: field.confidence,
            type: field.type,
            samples: field.samples
          }
        }
      })
      setMappings(initialMappings)
    }
  }, [detectedFields, contactFields, fieldsLoading])



  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 border-green-200'
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 90) return 'High'
    if (confidence >= 70) return 'Medium'
    return 'Low'
  }

  const handleNext = () => {
    setCurrentStep('mapping')
  }

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Loading field options...</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div>
        <h3 className="text-xl text-[#0E4259] font-semibold">Column Detection Results</h3>
        <p className="text-[#68818C] font-light">
          Our intelligent mapping has mapped 19 fields in this entry with the CRM Contact Fields
        </p>
      </div>

      {/* Import Summary*/}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex justify-center items-center text-center bg-[#E7FFEA] text-[#087025] p-3 gap-1 rounded-xl">
          <div className="">
            <Image src="/images/import/map/search.svg" alt="Success" width={20} height={20} />
          </div>
          <div className="">{Object.keys(mappings).length} Fields Mapped</div>
        </div>
        <div className="flex justify-center items-center text-center bg-[#F6F6FF] text-[#5740DF] p-3 gap-1 rounded-xl">
          <div className="">
            <Image src="/images/import/map/confidence.svg" alt="Success" width={20} height={20} />
          </div>
          <div className="">{Object.values(mappings).filter(m => Number(m.confidence) >= 70).length} High Confidence</div>
        </div>
        <div className="flex justify-center items-center text-center bg-[#FFF1FC] text-[#B71897] p-3 gap-1 rounded-xl">
          <div className="">
            <Image src="/images/import/map/custom.svg" alt="Success" width={20} height={20} />
          </div>
          <div className=""> {Object.values(mappings).filter(m => m.type === 'custom').length} Custom Fields</div>
        </div>
      </div>

      {/* Field Mappings */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {detectedFields.map((field, index) => {
          const currentMapping = mappings[field.name]
          const needsReview = field.confidence && Number(field.confidence) < 70
          const targetField = contactFields.find(f => f.id === currentMapping?.targetField)

          return (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card>
                <CardContent className="px-4">
                  <div className="flex items-center gap-4">
                    {/* Database Field Section */}
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 mb-2">

                        <Badge
                          variant="outline"
                          className={`${getConfidenceColor(Number(field.confidence))} text-xs`}
                        >
                          {Number(field.confidence)}%
                        </Badge>
                      </div>

                      <div className='flex flex-col gap-1'>
                        <div className='flex gap-2 items-start'>
                          <h4 className="font-semibold text-base">{field.name ?? 'Name'}</h4>
                          <Link2 className=" text-[#1970F3] font-bold" />
                          <h4 className="font-semibold text-[#1970F3] text-base ">{targetField?.label || currentMapping?.targetField || 'No mapping'}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Sample</span>
                          <div className="flex gap-1">
                            {field.samples.map((sample, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-[#F4F5F6] font-light px-2 py-1">
                                {typeof sample === 'object' ? JSON.stringify(sample) : String(sample) || 'Empty'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>


                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>


      {/* Navigation */}
      <div className="flex justify-between gap-4 items-center pt-6 border-t">
        <div className='flex-1'>
          <Button variant="outline" onClick={onPrevious}>
            Cancel
          </Button>
        </div>
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button className='bg-[#0E4259]' onClick={handleNext} disabled={Object.keys(mappings).length === 0}>
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>


    </motion.div>
  )
}