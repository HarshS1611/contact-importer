import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Users, Settings, TrendingUp, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {

  const stats = [
    {
      title: 'Total Contacts',
      value: '5',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Users',
      value: '1',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Custom Fields',
      value: '1',
      icon: Settings,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Total Imports',
      value: '0',
      icon: Upload,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const quickActions = [
    {
      title: 'Import Contacts',
      description: 'Upload and map your contact data',
      icon: Upload,
      href: '/import',
      color: 'text-blue-600'
    },
    {
      title: 'Manage Users',
      description: 'Add and edit system users',
      icon: Users,
      href: '/users',
      color: 'text-green-600'
    },
    {
      title: 'Custom Fields',
      description: 'Configure contact field types',
      icon: Settings,
      href: '/fields',
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to Contact Importer Pro. Manage your contacts and imports efficiently.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 ${stat.bgColor} rounded-full`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Card key={action.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-muted rounded-full">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href={action.href}>
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No recent activity</p>
            <p className="text-sm">Import your first contact file to see activity here</p>
            <Button asChild className="mt-4">
              <Link href="/import">
                <Upload className="h-4 w-4 mr-2" />
                Start Import
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}