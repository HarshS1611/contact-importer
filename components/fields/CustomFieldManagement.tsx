// components/fields/CustomFieldsManagement.tsx - Updated with toast.promise and confirm modal
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmModal } from "@/components/global/confirmModal"
import { useContactFields } from '@/hooks/useFirestore'
import { toast } from 'sonner'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  Check,
  X,
  AlertCircle,
  Eye,
  Lock
} from 'lucide-react'
import { ContactField } from '@/lib/types'

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single line text input' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address with validation' },
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values' },
  { value: 'datetime', label: 'Date/Time', icon: Calendar, description: 'Date and time picker' },
  { value: 'checkbox', label: 'Checkbox', icon: Check, description: 'True/false value' }
]

interface FieldFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingField?: ContactField | null
}

function FieldFormModal({ isOpen, onClose, editingField }: FieldFormModalProps) {
  const [label, setLabel] = useState(editingField?.label || '')
  const [type, setType] = useState<string>(editingField?.type || 'text')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { createCustomField, updateField } = useContactFields()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      setError('Field label is required')
      toast.error('Field label is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (editingField) {
        // Update existing field with toast.promise
        await updateField(editingField.id, {
          label: label.trim(),
          type: type as any,
          
        })
      } else {
        // Create new field with toast.promise
        await createCustomField({
          label: label.trim(),
          type: type as any,
          core: false,
        })
      }
      
      // Reset form
      setLabel('')
      setType('text')
      onClose()
    } catch (err) {
      console.error('Error saving field:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save field'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setLabel(editingField?.label || '')
      setType(editingField?.type || 'text')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingField ? 'Edit Field' : 'Create Custom Field'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Label Field */}
          <div className="space-y-2">
            <Label htmlFor="label">Field Label *</Label>
            <Input
              id="label"
              placeholder="e.g., Annual Revenue"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              This will appear as the field name in your contact forms
            </p>
          </div>

          {/* Type Field */}
          <div className="space-y-2">
            <Label htmlFor="type">Field Type</Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map(option => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

        
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Preview */}
          {label && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Preview:</div>
              <div className="text-sm text-blue-700">
                Field ID: <code className="bg-blue-100 px-1 rounded">{label.toLowerCase().replace(/\s+/g, '_')}</code>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !label.trim()}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {editingField ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {editingField ? 'Update Field' : 'Create Field'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CustomFieldsManagement() {
  const { data: fields, loading, deleteField } = useContactFields()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<ContactField | null>(null)

  // Confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    field: ContactField | null
  }>({
    isOpen: false,
    field: null
  })

  const coreFields = fields.filter(field => field.core)
  const customFields = fields.filter(field => !field.core)

  const handleDeleteClick = (field: ContactField) => {
    if (field.core) {
      toast.error('Cannot delete core fields')
      return
    }

    setDeleteConfirm({ isOpen: true, field })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.field) return

    try {
      await deleteField(deleteConfirm.field.id)
      setDeleteConfirm({ isOpen: false, field: null })
    } catch (error) {
      console.error('Error deleting field:', error)
      // Error is already handled by the toast.promise
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, field: null })
  }

  const handleEditField = (field: ContactField) => {
    if (field.core) {
      toast.error('Core fields cannot be edited')
      return
    }
    console.log(`Editing field with ID: ${field.id}`)
    setEditingField(field)
  }

  const getFieldTypeIcon = (type: string) => {
    const option = FIELD_TYPE_OPTIONS.find(opt => opt.value === type)
    return option ? option.icon : Type
  }

  const getFieldTypeLabel = (type: string) => {
    const option = FIELD_TYPE_OPTIONS.find(opt => opt.value === type)
    return option ? option.label : type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading contact fields...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Contact Fields ({fields.length})</h3>
          <p className="text-sm text-gray-600">
            Manage core and custom fields for your contact database
          </p>
        </div>
        
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Custom Field
        </Button>
      </div>

      {/* Core Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Core Fields ({coreFields.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            System-defined fields that cannot be deleted or modified
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreFields.map((field, index) => {
              const TypeIcon = getFieldTypeIcon(field.type)
              
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-blue-200 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TypeIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-blue-900 truncate">
                          {field.label}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                            {getFieldTypeLabel(field.type)}
                          </Badge>
                       
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          ID: <code className="bg-blue-100 px-1 rounded">{field.id}</code>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-50">
                      <Button variant="ghost" size="sm" disabled>
                        <Lock className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Custom Fields ({customFields.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            User-defined fields that can be edited or deleted
          </p>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No custom fields yet</h3>
              <p className="text-gray-600 mb-4">
                Create custom fields to capture additional contact information specific to your business needs.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Field
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customFields.map((field, index) => {
                const TypeIcon = getFieldTypeIcon(field.type)
                
                return (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TypeIcon className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {field.label}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getFieldTypeLabel(field.type)}
                            </Badge>
                            
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: <code className="bg-gray-100 px-1 rounded">{field.id}</code>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(field)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Info */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Settings className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-purple-900 mb-1">Field Usage</h4>
              <p className="text-sm text-purple-700">
                Custom fields can be mapped during CSV/Excel imports and will appear in your contact
                forms. Field IDs are automatically generated from the label and cannot be changed after creation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Field Modal */}
      <FieldFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Field Modal */}
      <FieldFormModal
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        editingField={editingField}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Custom Field"
        description={`Are you sure you want to delete the field "${deleteConfirm.field?.label}"? This action cannot be undone and will remove the field from all contacts.`}
        confirmText="Delete Field"
        variant="destructive"
        icon="delete"
      />
    </div>
  )
}