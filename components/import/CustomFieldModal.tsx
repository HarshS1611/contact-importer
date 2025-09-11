import { useContactFields } from "@/hooks/useFirestore"
import { useState } from "react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog,DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"

interface CustomFieldModalProps {
  isOpen: boolean
  onClose: () => void
  onFieldCreated: (fieldId: string) => void
}

export function CustomFieldModal({ isOpen, onClose, onFieldCreated }: CustomFieldModalProps) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('text')
  const [isLoading, setIsLoading] = useState(false)
  const { createCustomField } = useContactFields()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      toast.error('Field label is required')
      return
    }

    setIsLoading(true)

    try {
      // Use toast.promise for field creation
      const res = await createCustomField({
        label: label.trim(),
        type: type as any,
        core: false
      })
      const result = await res.unwrap() as { id?: string }
      
      const fieldId = result.id || label.toLowerCase().replace(/\s+/g, '_')
      onFieldCreated(fieldId)
      setLabel('')
      setType('text')
      onClose()
    } catch (error) {
      console.error('Error creating field:', error)
      // Error already handled by toast.promise in createCustomField
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Field Label</Label>
            <Input
              id="label"
              placeholder="e.g., Annual Revenue"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="type">Field Type</Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="datetime">Date/Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !label.trim()}>
              {isLoading ? 'Creating...' : 'Create Field'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}