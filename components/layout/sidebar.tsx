// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Upload, 
  Users, 
  UserCircle, 
  Settings 
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Import Contacts', href: '/import', icon: Upload },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Users', href: '/users', icon: UserCircle },
  { name: 'Contact Fields', href: '/fields', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold text-foreground">
          Contact Importer
        </h1>
      </div>
      
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}