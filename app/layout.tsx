// app/layout.tsx - Updated Root Layout with Authentication
import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Contact Importer Dashboard',
  description: 'Smart CSV/Excel contact import with auto-mapping and deduplication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
        
        <Toaster 
          position="top-right"
          richColors
          closeButton
          expand
          visibleToasts={5}
        />
      </body>
    </html>
  )
}