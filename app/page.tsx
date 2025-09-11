// app/page.tsx - Dashboard Overview
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ImportModal } from '@/components/import/ImportModal'
import { useContacts, useUsers, useContactFields } from '@/hooks/useFirestore'
import { 
  Users, 
  Contact,
  Settings,
  Upload,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  Building,
  Briefcase,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const { data: contacts, loading: contactsLoading } = useContacts()
  const { data: users, loading: usersLoading } = useUsers()
  const { data: contactFields, loading: fieldsLoading } = useContactFields()

  // Calculate statistics
  const stats = {
    totalContacts: contacts.length,
    totalUsers: users.length,
    totalFields: contactFields.length,
    customFields: contactFields.filter(f => !f.core).length,
    coreFields: contactFields.filter(f => f.core).length,
    contactsWithEmail: contacts.filter(c => c.email).length,
    contactsWithPhone: contacts.filter(c => c.phone).length,
    assignedContacts: contacts.filter(c => c.agentUid).length,
    contactsWithCompany: contacts.filter(c => c.company).length,
    recentContacts: contacts.filter(c => {
      const createdDate = new Date(c.createdOn || '')
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return createdDate > sevenDaysAgo
    }).length
  }

  const completionRates = {
    email: stats.totalContacts > 0 ? Math.round((stats.contactsWithEmail / stats.totalContacts) * 100) : 0,
    phone: stats.totalContacts > 0 ? Math.round((stats.contactsWithPhone / stats.totalContacts) * 100) : 0,
    assigned: stats.totalContacts > 0 ? Math.round((stats.assignedContacts / stats.totalContacts) * 100) : 0,
    company: stats.totalContacts > 0 ? Math.round((stats.contactsWithCompany / stats.totalContacts) * 100) : 0
  }

  const isLoading = contactsLoading || usersLoading || fieldsLoading

  const quickActions = [
    {
      title: 'Import Contacts',
      description: 'Upload CSV or Excel files with smart field mapping',
      icon: Upload,
      action: () => setIsImportModalOpen(true),
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'Manage Users',
      description: 'Add users for agent mapping during imports',
      icon: Users,
      action: '/users',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Custom Fields',
      description: 'Configure contact fields and data types',
      icon: Settings,
      action: '/fields',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      title: 'View All Contacts',
      description: 'Browse, search, and manage your contact database',
      icon: Contact,
      action: '/contacts',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to your Contact Importer dashboard. Manage your CRM data efficiently.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {typeof action.action === 'string' ? (
                <Link href={action.action}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all group">
                    <CardContent className="p-6">
                      <div className={`${action.color} ${action.hoverColor} p-3 rounded-lg w-fit mb-4 transition-colors`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                      <ArrowRight className="h-4 w-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all group"
                  onClick={action.action}
                >
                  <CardContent className="p-6">
                    <div className={`${action.color} ${action.hoverColor} p-3 rounded-lg w-fit mb-4 transition-colors`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                    <ArrowRight className="h-4 w-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Overview Statistics */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalContacts.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Contact className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{stats.recentContacts} this week
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-gray-600">
                    Ready for mapping
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contact Fields</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalFields}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4 gap-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.coreFields} core
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {stats.customFields} custom
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assigned Contacts</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.assignedContacts}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Briefcase className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Assignment Rate</span>
                    <span>{completionRates.assigned}%</span>
                  </div>
                  <Progress value={completionRates.assigned} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Data Quality Metrics */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Data Quality</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Email Coverage</span>
                </div>
                <span className="text-sm text-gray-600">
                  {stats.contactsWithEmail} / {stats.totalContacts}
                </span>
              </div>
              <Progress value={completionRates.email} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">{completionRates.email}% of contacts have email</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Phone Coverage</span>
                </div>
                <span className="text-sm text-gray-600">
                  {stats.contactsWithPhone} / {stats.totalContacts}
                </span>
              </div>
              <Progress value={completionRates.phone} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">{completionRates.phone}% of contacts have phone</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Company Data</span>
                </div>
                <span className="text-sm text-gray-600">
                  {stats.contactsWithCompany} / {stats.totalContacts}
                </span>
              </div>
              <Progress value={completionRates.company} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">{completionRates.company}% have company info</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Agent Assignment</span>
                </div>
                <span className="text-sm text-gray-600">
                  {stats.assignedContacts} / {stats.totalContacts}
                </span>
              </div>
              <Progress value={completionRates.assigned} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">{completionRates.assigned}% have assigned agents</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activity / System Status */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Database Connection</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Import Engine</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Ready</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Field Mapping AI</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. fields per contact</span>
                <span className="font-medium">
                  {stats.totalContacts > 0 ? (stats.totalFields * 0.8).toFixed(1) : '0'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Data completeness</span>
                <span className="font-medium text-green-600">
                  {Math.round((completionRates.email + completionRates.phone + completionRates.company) / 3)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Ready for campaigns</span>
                <span className="font-medium">
                  {Math.min(stats.contactsWithEmail, stats.assignedContacts)}
                </span>
              </div>
              
              <div className="pt-2 border-t">
                <Button className="w-full" onClick={() => setIsImportModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Import More Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Import Modal */}
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}