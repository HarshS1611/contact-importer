// components/contacts/ContactsTable.tsx - Dynamic Fields Display
'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { useContacts, useUsers, useContactFields } from '@/hooks/useFirestore'
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
  UserCheck,
  UserX,
  FilterX,
  Settings,
  MoreHorizontal
} from 'lucide-react'
import { ConfirmModal } from '../global/confirmModal'
import { Contact } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ContactsTable() {
  const { data: contacts, loading: contactsLoading, remove } = useContacts()
  const { data: users, loading: usersLoading } = useUsers()
  const { data: contactFields, loading: fieldsLoading } = useContactFields()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  
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
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Get all unique field keys from contacts and contact fields
  const allFieldKeys = useMemo(() => {
    const fieldSet = new Set<string>()
    
    // Add core fields first
    const coreFields = ['firstName', 'lastName', 'email', 'phone', 'agentUid', 'createdOn']
    coreFields.forEach(field => fieldSet.add(field))
    
    // Add fields from contactFields collection
    contactFields.forEach(field => fieldSet.add(field.id))
    
    // Add any additional fields found in actual contact data
    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => {
        if (key !== 'id') { // Exclude the document ID
          fieldSet.add(key)
        }
      })
    })
    
    return Array.from(fieldSet)
  }, [contacts, contactFields])

  // Initialize visible columns
  useEffect(() => {
    if (allFieldKeys.length > 0 && visibleColumns.length === 0) {
      // Show core fields by default
      const defaultColumns = ['firstName', 'lastName', 'email', 'phone', 'agentUid', 'createdOn']
      setVisibleColumns(defaultColumns.filter(col => allFieldKeys.includes(col)))
    }
  }, [allFieldKeys, visibleColumns.length])

  // Create user lookup map for agent resolution
  const userLookup = useMemo(() => {
    const lookup: Record<string, { name: string; email: string }> = {}
    users.forEach(user => {
      lookup[user.id] = {
        name: user.name,
        email: user.email
      }
    })
    return lookup
  }, [users])

  // Get field display information
  const getFieldInfo = (fieldKey: string) => {
    const fieldDef = contactFields.find(f => f.id === fieldKey)
    return {
      label: fieldDef?.label || formatFieldLabel(fieldKey),
      type: fieldDef?.type || 'text',
      core: fieldDef?.core || false
    }
  }

  // Format field label for display
  const formatFieldLabel = (fieldKey: string): string => {
    // Convert camelCase to Title Case
    return fieldKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Format field value for display
  const formatFieldValue = (value: any, fieldKey: string, fieldType?: string): string => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }

    // Special handling for specific fields
    switch (fieldKey) {
      case 'agentUid':
        const agent = userLookup[value]
        return agent ? `${agent.name}` : value
      
      case 'createdOn':
      case 'updatedOn':
        try {
          const date = new Date(value)
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } catch {
          return value?.toString() || '-'
        }
      
      case 'phone':
        // Format phone number if it's a valid format
        const phoneStr = value?.toString() || ''
        if (phoneStr.length >= 10) {
          return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
        }
        return phoneStr
      
      default:
        // Handle based on field type
        switch (fieldType) {
          case 'email':
            return value?.toString() || '-'
          
          case 'checkbox':
            return value === true || value === 'true' ? 'Yes' : 'No'
          
          case 'number':
            return typeof value === 'number' ? value.toLocaleString() : value?.toString() || '-'
          
          case 'datetime':
            try {
              return new Date(value).toLocaleDateString()
            } catch {
              return value?.toString() || '-'
            }
          
          default:
            // Truncate long text values
            const strValue = value?.toString() || '-'
            return strValue.length > 50 ? strValue.substring(0, 47) + '...' : strValue
        }
    }
  }

  const filteredContacts = useMemo(() => {
    
    const filtered = contacts.filter(contact => {
      // Enhanced search filter - now includes agent email
      const searchLower = searchTerm.toLowerCase()
      const agentId = contact.agentUid || contact.agentEmail || ''
      const agent = userLookup[agentId] || userLookup[agentId.toLowerCase()]
      
      const matchesSearch = !searchTerm || 
        contact.firstName?.toLowerCase().includes(searchLower) ||
        contact.lastName?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.company?.toLowerCase().includes(searchLower) ||
        contact.jobTitle?.toLowerCase().includes(searchLower) ||
        agent?.name?.toLowerCase().includes(searchLower) ||
        agent?.email?.toLowerCase().includes(searchLower) ||
        agentId?.toLowerCase().includes(searchLower)

      // Enhanced agent filter with better logic
      let matchesAgent = false
      
      if (filterAgent === 'all') {
        matchesAgent = true
      } else if (filterAgent === 'unassigned') {
        // Consider contact unassigned if agentUid is null, undefined, empty, or 'unassigned'
        matchesAgent = !contact.agentUid || 
                     contact.agentUid === '' || 
                     contact.agentUid === 'unassigned' ||
                     contact.agentUid === 'null'
      } else {
        // Check if the contact's agentUid matches the selected filter
        // Handle both direct ID match and email match
        const contactAgentId = contact.agentUid || contact.agentEmail || ''
        matchesAgent = contactAgentId === filterAgent || 
                      contactAgentId.toLowerCase() === filterAgent.toLowerCase()
        
        // Also check if the agent email matches
        const selectedUser = users.find(u => (u.id || u.uid) === filterAgent)
        if (selectedUser && selectedUser.email) {
          matchesAgent = matchesAgent || 
                        contactAgentId.toLowerCase() === selectedUser.email.toLowerCase()
        }
      }

      const result = matchesSearch && matchesAgent
      if (filterAgent !== 'all') {
        console.log('Filter check for contact:', {
          name: contact.firstName + ' ' + contact.lastName,
          agentUid: contact.agentUid,
          filterAgent,
          matchesAgent,
          result
        })
      }

      return result
    })

    console.log('Filtered results:', filtered.length, 'out of', contacts.length)
    return filtered
  }, [contacts, searchTerm, filterAgent, userLookup, users])

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

  // Enhanced export with all fields
  const exportContacts = () => {
    try {
      const headers = visibleColumns.map(key => getFieldInfo(key).label)
      const csvContent = [
        headers,
        ...filteredContacts.map(contact => 
          visibleColumns.map(key => {
            const value = contact[key]
            const fieldInfo = getFieldInfo(key)
            const formattedValue = formatFieldValue(value, key, fieldInfo.type)
            return formattedValue === '-' ? '' : formattedValue
          })
        )
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

      toast.success(`Exported ${filteredContacts.length} contacts successfully`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed. Please try again.')
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setFilterAgent('all')
    toast.success('Filters cleared')
  }

  // Toggle column visibility
  const toggleColumn = (fieldKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(fieldKey)
        ? prev.filter(col => col !== fieldKey)
        : [...prev, fieldKey]
    )
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

  if (contactsLoading || usersLoading || fieldsLoading) {
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
      {/* Enhanced Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Enhanced Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search across all contact fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            {/* Agent Filter */}
            <div className="w-full sm:w-56">
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Agents
                    </div>
                  </SelectItem>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Unassigned
                    </div>
                  </SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
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

            {/* Enhanced Actions */}
            <div className="flex gap-2">
              {/* Column Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns ({visibleColumns.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allFieldKeys.map(fieldKey => {
                    const fieldInfo = getFieldInfo(fieldKey)
                    return (
                      <DropdownMenuItem
                        key={fieldKey}
                        onClick={() => toggleColumn(fieldKey)}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {fieldInfo.core && <Badge variant="secondary" className="text-xs">Core</Badge>}
                          {fieldInfo.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(fieldKey)}
                          onChange={() => {}}
                          className="rounded"
                        />
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear filters button */}
              {(searchTerm || filterAgent !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  <FilterX className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}

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

          {/* Active filters indicator */}
          {(searchTerm || filterAgent !== 'all') && (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Active filters:
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {filterAgent !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Agent: {filterAgent === 'unassigned' ? 'Unassigned' : userLookup[filterAgent]?.name || filterAgent}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Summary */}
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
              <UserCheck className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold">
                  {filteredContacts.filter(c => c.agentUid && c.agentUid !== 'unassigned' && c.agentUid !== '').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Visible Fields</p>
                <p className="text-2xl font-bold">{visibleColumns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Fields</p>
                <p className="text-2xl font-bold">{allFieldKeys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Contacts Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({totalItems})
              {(searchTerm || filterAgent !== 'all') && (
                <Badge variant="outline" className="ml-2">
                  Filtered
                </Badge>
              )}
            </CardTitle>
            
            {currentContacts.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === currentContacts.length && currentContacts.length > 0}
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
              {(searchTerm || filterAgent !== 'all') && (
                <span className="ml-1">(filtered from {contacts.length} total)</span>
              )}
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
              {(searchTerm || filterAgent !== 'all') && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  <FilterX className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Selection Column */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === currentContacts.length && currentContacts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      
                      {/* Dynamic Field Columns */}
                      {visibleColumns.map(fieldKey => {
                        const fieldInfo = getFieldInfo(fieldKey)
                        return (
                          <th 
                            key={fieldKey}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-1">
                            
                              {fieldInfo.label}
                            </div>
                          </th>
                        )
                      })}
                      
                      {/* Actions Column */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentContacts.map((contact) => {
                      const isSelected = selectedContacts.includes(contact.id)
                      
                      return (
                        <motion.tr
                          key={contact.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          {/* Selection */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectContact(contact.id)}
                              className="rounded"
                            />
                          </td>
                          
                          {/* Dynamic Field Values */}
                          {visibleColumns.map(fieldKey => {
                            const fieldInfo = getFieldInfo(fieldKey)
                            const value = contact[fieldKey]
                            const formattedValue = formatFieldValue(value, fieldKey, fieldInfo.type)
                            
                            return (
                              <td key={fieldKey} className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formattedValue}
                                </div>
                                {fieldKey === 'agentUid' && value && userLookup[value] && (
                                  <div className="text-xs text-gray-500">
                                    {userLookup[value].email}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                          
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className='bg-red-50 hover:bg-red-100'
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
