// app/fields/page.tsx - Fields Management Page (Updated for Sidebar)
'use client'

import { CustomFieldsManagement } from "@/components/fields/CustomFieldManagement"

export default function FieldsPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contact Fields</h1>
        <p className="text-gray-600 mt-1">
          Manage core and custom contact fields. Custom fields can be created during import or defined in advance.
        </p>
      </div>

      {/* Custom Fields Management Component */}
      <CustomFieldsManagement />
    </div>
  )
}