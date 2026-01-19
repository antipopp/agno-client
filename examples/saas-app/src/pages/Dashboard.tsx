import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const revenueData = [
  { date: '2025-01-01', revenue: '$45,231', growth: '+12.5%', status: 'On Track' },
  { date: '2025-01-02', revenue: '$52,120', growth: '+15.3%', status: 'On Track' },
  { date: '2025-01-03', revenue: '$48,900', growth: '+8.1%', status: 'On Track' },
  { date: '2025-01-04', revenue: '$61,450', growth: '+25.6%', status: 'Exceeding' },
  { date: '2025-01-05', revenue: '$43,780', growth: '+5.2%', status: 'On Track' },
]

const metrics = [
  { title: 'Total Revenue', value: '$251,481', change: '+13.5%' },
  { title: 'Monthly Growth', value: '15.3%', change: '+2.1%' },
  { title: 'Active Users', value: '12,847', change: '+8.2%' },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your business metrics</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{metric.change}</span> from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Growth</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueData.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="font-medium">{row.revenue}</TableCell>
                  <TableCell className="text-green-600">{row.growth}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.status === 'Exceeding'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
