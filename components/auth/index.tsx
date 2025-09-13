'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '../global/Sidebar'
import LoadingSpinner from './LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Redirect logic in useEffect to avoid router push during render
  useEffect(() => {
      if (!user && !isPublicRoute) {
        router.push('/auth/login')
      } else if (user && isPublicRoute) {
        router.push('/')
      }
    
  }, [user, loading, isPublicRoute, pathname, router])

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner />
  }

  // After navigation triggered by useEffect, still render UI accordingly:
  if (user && !isPublicRoute) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <main className="flex-1 overflow-auto text-black">{children}</main>
        </div>
      </div>
    )
  }

  if (user && isPublicRoute) {
    // Optionally you can still return null or loading until router pushes
    return null
  }

  // Public routes (login/signup pages)
  return <>{children}</>
}
