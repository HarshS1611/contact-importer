// app/contacts/page.tsx - Contacts Management Page
'use client'

import { ContactsTable } from '@/components/contacts/ContactsTable'

export default function ContactsPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <p className="text-gray-600 mt-1">
          Manage and view your contact database with advanced search and filtering.
        </p>
      </div>

      {/* Contacts Table */}
      <ContactsTable />
    </div>
  )
}