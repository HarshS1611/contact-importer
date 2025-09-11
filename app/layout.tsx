// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { Sidebar } from '@/components/global/Sidebar'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Contact Importer Pro',
  description: 'Smart contact import system with field mapping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative flex  min-h-screen bg-background">
          <Sidebar />
          <main className="lg:pl-72 flex-1" >
            {children}
          </main>
        </div>
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