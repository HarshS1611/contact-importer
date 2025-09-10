// app/users/page.tsx - Users Management Page (Updated for Sidebar)
'use client'

import { UserManagement } from "@/components/user/UserManagement"

export default function UsersPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">
          Manage users for agent mapping during contact imports. User email addresses will be matched during the import process.
        </p>
      </div>

      {/* User Management Component */}
      <UserManagement />
    </div>
  )
}