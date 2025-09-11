// components/contacts/ContactsTable.tsx - With Pagination & Toast
'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useContacts, useUsers } from '@/hooks/useFirestore'
import { toast } from 'sonner'
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Building,
  Briefcase,
  Users,
  Download,
  Trash2,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { ConfirmModal } from '../global/confirmModal'
import { Contact } from '@/lib/types'

export function ContactsTable() {
  const { data: contacts, loading: contactsLoading, remove } = useContacts()
  const { data: users, loading: usersLoading } = useUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'single' | 'multiple'
    contact?: Contact
    contacts?: Contact[]
    isLoading: boolean
  }>({
    isOpen: false,
    type: 'single',
    isLoading: false
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Create user lookup map for agent resolution
  const userLookup = useMemo(() => {
    const lookup: Record<string, { name: string; email: string }> = {}
    users.forEach(user => {
      lookup[user.uid] = {
        name: user.name,
        email: user.email
      }
    })
    return lookup
  }, [users])

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm || 
        contact.firstName?.toLowerCase().includes(searchLower) ||
        contact.lastName?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        userLookup[contact.agentUid]?.name?.toLowerCase().includes(searchLower)

      // Agent filter
      const matchesAgent = filterAgent === 'all' || 
        contact.agentUid === filterAgent ||
        (filterAgent === 'unassigned' && !contact.agentUid)

      return matchesSearch && matchesAgent
    })
  }, [contacts, searchTerm, filterAgent, userLookup])

  // Pagination calculations
  const totalItems = filteredContacts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const currentContacts = filteredContacts.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAgent, itemsPerPage])

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === currentContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(currentContacts.map(c => c.id))
    }
  }

  const handleDeleteSelected = async () => {
    const contactsToDelete = contacts.filter(c => selectedContacts.includes(c.id))
    setDeleteConfirm({
      isOpen: true,
      type: 'multiple',
      contacts: contactsToDelete,
      isLoading: false
    })
  }

  const handleDeleteSingle = (contact: Contact) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'single',
      contact,
      isLoading: false
    })
  }

  const handleDeleteConfirm = async () => {
    setDeleteConfirm(prev => ({ ...prev, isLoading: true }))

    try {
      if (deleteConfirm.type === 'single' && deleteConfirm.contact) {
        await remove(deleteConfirm.contact.id, `${deleteConfirm.contact.firstName} ${deleteConfirm.contact.lastName}`)
      } else if (deleteConfirm.type === 'multiple' && deleteConfirm.contacts) {
        await Promise.all(deleteConfirm.contacts.map(contact => 
          remove(contact.id, `${contact.firstName} ${contact.lastName}`)
        ))
        setSelectedContacts([])
      }
      
      setDeleteConfirm({ isOpen: false, type: 'single', isLoading: false })
    } catch (error) {
      console.error('Error deleting contacts:', error)
      setDeleteConfirm(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, type: 'single', isLoading: false })
  }

  const exportContacts = () => {
    try {
      
      const csvContent = [
        // Headers
        ['First Name', 'Last Name', 'Email', 'Phone', 'Agent', 'Company', 'Job Title', 'Created On'],
        // Data
        ...filteredContacts.map(contact => [
          contact.firstName || '',
          contact.lastName || '',
          contact.email || '',
          contact.phone || '',
          userLookup[contact.agentUid]?.name || '',
          contact.company || '',
          contact.jobTitle || '',
          contact.createdOn ? new Date(contact.createdOn).toLocaleDateString() : ''
        ])
      ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const renderPaginationItems = () => {
    const items = []
    const showEllipsis = totalPages > 7
    
    if (showEllipsis) {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink 
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      )

      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Always show last page (if more than 1 page)
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink 
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    }

    return items
  }

  if (contactsLoading || usersLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading contacts...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone, or agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Agent Filter */}
            <div className="w-full sm:w-48">
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items per page */}
            <div className="w-full sm:w-32">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportContacts} disabled={filteredContacts.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              {selectedContacts.length > 0 && (
                <Button variant="destructive" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedContacts.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold">
                  {filteredContacts.filter(c => c.agentUid).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">With Email</p>
                <p className="text-2xl font-bold">
                  {filteredContacts.filter(c => c.email).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">With Phone</p>
                <p className="text-2xl font-bold">
                  {filteredContacts.filter(c => c.phone).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({totalItems})
            </CardTitle>
            
            {currentContacts.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === currentContacts.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            )}
          </div>

          {/* Pagination Info */}
          {totalItems > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {endIndex} of {totalItems} contacts
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-600">
                {searchTerm || filterAgent !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start by importing contacts from a CSV or Excel file.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === currentContacts.length && currentContacts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email & Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentContacts.map((contact) => {
                      const isSelected = selectedContacts.includes(contact.id)
                      const contactName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'
                      
                      return (
                        <motion.tr
                          key={contact.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          {/* Select */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectContact(contact.id)}
                              className="rounded"
                            />
                          </td>
                          
                          {/* Contact Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {(contact.firstName?.[0] || contact.lastName?.[0] || '?').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {contactName}
                                </div>
                                {contact.jobTitle && (
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Briefcase className="h-3 w-3 mr-1" />
                                    {contact.jobTitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Email & Phone */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {contact.email && (
                                <div className="text-sm text-gray-900 flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                              {contact.phone && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {contact.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Assigned Agent */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {contact.agentUid != 'unassigned' ? (
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.agentUid}
                                </div>
                    
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Unassigned Agent
                              </Badge>
                            )}
                          </td>
                          
                          {/* Company */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {contact.company ? (
                              <div className="text-sm text-gray-900 flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {contact.company}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Created */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {contact.createdOn 
                                ? new Date(contact.createdOn).toLocaleDateString()
                                : 'Unknown'
                              }
                            </div>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteSingle(contact)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {endIndex} of {totalItems} contacts
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {renderPaginationItems()}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
       {/* Delete Confirmation Modal */}
       {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirm.type === 'single' ? 'Delete Contact' : 'Delete Multiple Contacts'}
        description={
          deleteConfirm.type === 'single' && deleteConfirm.contact
            ? `Are you sure you want to delete "${deleteConfirm.contact.firstName} ${deleteConfirm.contact.lastName}"? This action cannot be undone.`
            : `Are you sure you want to delete ${deleteConfirm.contacts?.length || 0} contacts? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="destructive"
        icon="delete"
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  )
}