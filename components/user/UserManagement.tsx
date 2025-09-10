// components/users/UserManagement.tsx - Updated with toast.promise and confirm modal
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmModal } from "@/components/global/confirmModal"
import { useUsers } from '@/hooks/useFirestore'
import { toast } from 'sonner'
import { 
  UserPlus, 
  Users, 
  Mail, 
  Edit, 
  Trash2, 
  Calendar,
  Check,
  X,
  AlertCircle,
  Search,
  Copy,
  Hash
} from 'lucide-react'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  editingUser?: any
}

function AddUserModal({ isOpen, onClose, editingUser }: AddUserModalProps) {
  const [name, setName] = useState(editingUser?.name || '')
  const [email, setEmail] = useState(editingUser?.email || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { createUser, updateUser } = useUsers()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required')
      toast.error('Name and email are required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (editingUser) {
        // Update existing user with toast.promise
        await updateUser(editingUser.id, { name: name.trim(), email: email.trim() }, name)
      } else {
        // Create new user with toast.promise
        await createUser({ name: name.trim(), email: email.trim() })
      }
      
      // Reset form
      setName('')
      setEmail('')
      onClose()
    } catch (err) {
      console.error('Error saving user:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save user'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setEmail('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="e.g., John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john.smith@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              This email will be used for agent mapping in contact imports
            </p>
          </div>

          {/* Agent ID Info */}
          {!editingUser && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Agent ID</span>
              </div>
              <p className="text-sm text-blue-700">
                A unique Firebase document ID will be automatically generated as the Agent ID when you create this user.
              </p>
            </div>
          )}

          {/* Editing User ID Display */}
          {editingUser && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Agent ID</span>
                  </div>
                  <code className="text-sm text-green-700 break-all">{editingUser.id}</code>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(editingUser.id)
                    toast.success('Agent ID copied to clipboard')
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !email.trim()}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {editingUser ? 'Update User' : 'Create User'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UserManagement() {
  const { data: users, loading, deleteUser } = useUsers()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: any | null }>({
    isOpen: false,
    user: null
  })

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClick = (user: any) => {
    setDeleteConfirm({ isOpen: true, user })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.user) return

    try {
      await deleteUser(deleteConfirm.user.id, deleteConfirm.user.name)
      setDeleteConfirm({ isOpen: false, user: null })
    } catch (error) {
      console.error('Error deleting user:', error)
      // Error is already handled by the toast.promise
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, user: null })
  }

  const handleEditUser = (user: any) => {
    console.log(`Editing user with ID: ${user.id}`)
    setEditingUser(user)
  }

  const handleCloseEditModal = () => {
    setEditingUser(null)
  }

  const copyAgentId = (agentId: string, userName: string) => {
    navigator.clipboard.writeText(agentId)
    toast.success(`Copied Agent ID for ${userName}`)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading users...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">System Users ({users.length})</h3>
          <p className="text-sm text-gray-600">
            Add users to enable agent mapping during contact imports. Each user gets a unique Firebase Agent ID.
          </p>
        </div>
        
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name, email, or Agent ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'Add your first user to enable agent mapping in contact imports.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First User
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-lg font-medium text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {user.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          Agent
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                      
                      {/* Agent ID Display */}
                      <div className="flex items-center text-xs text-gray-400 mt-1 gap-2">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">Agent ID: {user.id}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAgentId(user.id, user.name)}
                          className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {user.createdAt && (
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(user)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Hash className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Agent ID Mapping</h4>
              <p className="text-sm text-blue-700">
                When importing contacts, the system will automatically map agent email addresses 
                in your CSV/Excel files to these Firebase-generated Agent IDs. The Agent ID is the unique 
                document identifier that Firebase creates automatically when a user is added.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit User Modal */}
      <AddUserModal
        isOpen={!!editingUser}
        onClose={handleCloseEditModal}
        editingUser={editingUser}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteConfirm.user?.name}"? This action cannot be undone and will remove the user from all agent mappings.`}
        confirmText="Delete User"
        variant="destructive"
        icon="delete"
      />
    </div>
  )
}