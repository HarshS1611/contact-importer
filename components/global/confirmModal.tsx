// components/ui/confirm-modal.tsx - Reusable Confirmation Modal
'use client'

import { AlertTriangle, Trash2, Edit, UserX, Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
  icon?: 'delete' | 'edit' | 'user' | 'settings' | 'warning'
  isLoading?: boolean
}

const iconMap = {
  delete: Trash2,
  edit: Edit,
  user: UserX,
  settings: Settings,
  warning: AlertTriangle
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon = 'warning',
  isLoading = false
}: ConfirmModalProps) {
  const IconComponent = iconMap[icon]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <IconComponent className={`h-5 w-5 ${
                variant === 'destructive' ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-600">{description}</p>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}