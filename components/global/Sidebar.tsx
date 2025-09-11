// components/layout/Sidebar.tsx - Navigation Sidebar
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImportModal } from '@/components/import/ImportModal'
import { useContacts, useUsers, useContactFields } from '@/hooks/useFirestore'
import { 
  Home,
  Users, 
  Contact,
  Settings,
  Upload,
  Database,
  BarChart3,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
  isActive: boolean
}

function NavItem({ href, icon: Icon, label, badge, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4 }}
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-lg transition-colors group",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span className="font-medium">{label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {badge !== undefined && badge > 0 && (
            <Badge 
              variant={isActive ? "secondary" : "outline"} 
              className="text-xs"
            >
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
          <ChevronRight className={cn(
            "h-4 w-4 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />
        </div>
      </motion.div>
    </Link>
  )
}

export function Sidebar() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Get data for badge counts
  const { data: contacts } = useContacts()
  const { data: users } = useUsers()
  const { data: contactFields } = useContactFields()

  const navigation = [
    {
      href: '/',
      icon: Home,
      label: 'Dashboard',
      badge: undefined
    },
    {
      href: '/contacts',
      icon: Contact,
      label: 'Contacts',
      badge: contacts.length
    },
    {
      href: '/users',
      icon: Users,
      label: 'Users',
      badge: users.length
    },
    {
      href: '/fields',
      icon: Settings,
      label: 'Contact Fields',
      badge: contactFields.length
    }
  ]

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed  inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:inset-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-8 border-b border-gray-200">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contact Importer</h1>
              <p className="text-sm text-gray-500">Smart CRM Integration</p>
            </div>
          </div>

          {/* Import Button */}
          <div className="px-6 py-6">
            <Button 
              onClick={() => setIsImportModalOpen(true)}
              className="w-full flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Upload className="h-4 w-4" />
              Import Contacts
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                isActive={pathname === item.href}
              />
            ))}
          </nav>

      
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Import Modal */}
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </>
  )
}