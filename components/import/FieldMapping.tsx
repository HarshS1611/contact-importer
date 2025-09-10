// components/import/FieldMapping.tsx - UPDATED WITH CUSTOM FIELD CREATION
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DetectedField, FieldMapping as FieldMappingType, ContactField } from '@/lib/types'
import { useContactFields, useUsers } from '@/hooks/useFirestore'
import { CustomFieldModal } from './CustomFieldModal'
import { ArrowRight, ArrowLeft, RotateCcw, Settings, AlertTriangle, Edit, Check, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface FieldMappingProps {
  detectedFields: DetectedField[]
  onMappingComplete: (mappings: Record<string, FieldMappingType>) => void
  onPrevious: () => void
}

export function FieldMapping({ detectedFields, onMappingComplete, onPrevious }: FieldMappingProps) {
  const { data: contactFields, loading: fieldsLoading } = useContactFields()
  const [mappings, setMappings] = useState<Record<string, FieldMappingType>>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false)

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

  const handleMappingChange = (sourceField: string, targetField: string) => {
    const detectedField = detectedFields.find(f => f.name === sourceField)
    if (!detectedField) return

    if (targetField === 'skip') {
      // Remove mapping if skipped
      const newMappings = { ...mappings }
      delete newMappings[sourceField]
      setMappings(newMappings)
    } else if (targetField === 'create-custom') {
      // Open custom field creation modal
      setIsCustomFieldModalOpen(true)
      return // Don't close editing mode yet
    } else {
      const contactField = contactFields.find(f => f.id === targetField)
      setMappings(prev => ({
        ...prev,
        [sourceField]: {
          name: sourceField,
          targetField: targetField,
          confidence: detectedField.confidence,
          type: contactField?.core ? 'core' : 'custom',
          samples: detectedField.samples
        }
      }))
    }
    setEditingField(null)
  }

  const handleCustomFieldCreated = (fieldId: string) => {
    console.log('Custom field created:', fieldId)

    setTimeout(() => {
      const newField = contactFields.find(cf => cf.id === fieldId)
      if (newField) {
        toast.success(`Custom field "${newField.label}" created and ready for mapping`)
      }
    }, 500)
    

    setEditingField(null)
  }

  const resetToDefault = () => {
    const defaultMappings: Record<string, FieldMappingType> = {}
    detectedFields.forEach(field => {
      if (field.suggestedMapping && field.confidence > 50) {
        defaultMappings[field.name] = {
          name: field.name,
          targetField: field.suggestedMapping,
          confidence: field.confidence,
          type: field.type,
          samples: field.samples
        }
      }
    })
    setMappings(defaultMappings)
  }



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

  

  const coreFields = contactFields.filter(f => f.core)
  const customFieldOptions = contactFields.filter(f => !f.core)

  const handleNext = () => {
    const mappedFieldsCount = Object.keys(mappings).length
    console.log(`Proceeding with ${mappedFieldsCount} field mappings:`, mappings)
    onMappingComplete(mappings)
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
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Smart Field Mapping</h3>
        <p className="text-muted-foreground">
          Review and adjust the AI-powered field mappings below. Click "Edit" next to any mapping to change it.
          You can map to existing CRM fields or create custom fields with different data types.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomFieldModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Field
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {Object.keys(mappings).length} of {detectedFields.length} fields mapped
        </div>
      </div>

      {/* Field Mappings */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto">
        {detectedFields.map((field, index) => {
          const currentMapping = mappings[field.name]
          const needsReview = field.confidence && Number(field.confidence) < 70
          const isEditing = editingField === field.name
          const targetField = contactFields.find(f => f.id === currentMapping?.targetField)

          return (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card className={`${needsReview ? 'border-orange-200 bg-orange-50/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Database Field Section */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs font-medium">
                          DATABASE FIELD
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${getConfidenceColor(Number(field.confidence))} text-xs`}
                        >
                            {Number(field.confidence)}% • {getConfidenceText(Number(field.confidence))}
                        </Badge>
                      </div>

                      <h4 className="font-semibold text-base mb-2">{field.name ?? 'Name'}</h4>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Sample:</span>
                        <div className="flex gap-1 flex-wrap">
                          {field.samples.map((sample, i) => (
                            <Badge key={i} variant="secondary" className="text-xs px-2 py-1">
                              {typeof sample === 'object' ? JSON.stringify(sample) : String(sample) || 'Empty'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* CRM Field Section */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {field.type === 'core' ? 'CORE FIELD' : 'CRM FIELD'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleMappingChange(field.name, field.suggestedMapping || '')}
                          >
                            Reset
                          </Button>
                          {!isEditing ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => setEditingField(field.name)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-green-600"
                                onClick={() => setEditingField(null)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600"
                                onClick={() => setEditingField(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isEditing ? (
                        <div>
                          <h4 className="font-semibold text-base text-blue-600 mb-1">
                            {targetField?.label || currentMapping?.targetField || 'No mapping'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {targetField ? (
                              `${targetField.core ? 'Core' : 'Custom'} Field • ${targetField.type}`
                            ) : (
                              currentMapping ? 'Unknown field type' : 'Click Edit to select a field'
                            )}
                          </p>
                        </div>
                      ) : (
                        <Select
                          value={currentMapping?.targetField || ''}
                          onValueChange={(value) => handleMappingChange(field.name, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select field mapping..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip" className="text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Don't import this field
                              </div>
                            </SelectItem>
                            <SelectItem value="create-custom" className="text-primary">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create Custom Field
                              </div>
                            </SelectItem>

                            {/* Core Fields */}
                            {coreFields.length > 0 && (
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-2">
                                Core Fields
                              </div>
                            )}
                            {coreFields.map((coreField) => (
                              <SelectItem key={coreField.id} value={coreField.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{coreField.label}</span>
                                  {currentMapping?.targetField === coreField.id && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}

                            {/* Custom Fields */}
                            {customFieldOptions.length > 0 && (
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-2">
                                Custom Fields
                              </div>
                            )}
                            {customFieldOptions.map((customField) => (
                              <SelectItem key={customField.id} value={customField.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{customField.label}</span>
                                  {currentMapping?.targetField === customField.id && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Manual Review Warning */}
                  {needsReview && (
                    <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-md flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="text-sm text-orange-700">
                        Manual Review Recommended - Low confidence mapping
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Card */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(mappings).length}</div>
              <div className="text-muted-foreground">Fields Mapped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
              {Object.values(mappings).filter(m => Number(m.confidence) >= 70).length}
              </div>
              <div className="text-muted-foreground">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(mappings).filter(m => m.type === 'custom').length}
              </div>
              <div className="text-muted-foreground">Custom Fields</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} disabled={Object.keys(mappings).length === 0}>
          Next: Final Review
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Custom Field Creation Modal */}
      <CustomFieldModal
        isOpen={isCustomFieldModalOpen}
        onClose={() => setIsCustomFieldModalOpen(false)}
        onFieldCreated={handleCustomFieldCreated}
      />
    </motion.div>
  )
}