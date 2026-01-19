import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAgnoToolExecution, type ToolHandler } from '@antipopp/agno-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Sparkles, Loader2 } from 'lucide-react'
import { format } from "date-fns"

const formSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  category: z.enum(['financial', 'sales', 'marketing', 'customer', 'product']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})

type FormValues = z.infer<typeof formSchema>

export function NewReport() {
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      startDate: '',
      endDate: '',
    },
  })

  // Check for pending report data from sessionStorage (set by global handler)
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingReportData')
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData)

        // Clear immediately to prevent double application in Strict Mode
        sessionStorage.removeItem('pendingReportData')

        // Apply data to form using react-hook-form's reset method
        form.reset({
          name: data.name || '',
          description: data.description || '',
          category: data.category || undefined,
          startDate: data.start_date || '',
          endDate: data.end_date || '',
        })
      } catch (error) {
        console.error('Failed to apply pending report data:', error)
      }
    }
  }, [form])

  // Define tool handler for filling the form (overrides global handler when on this page)
  const toolHandlers: Record<string, ToolHandler> = useMemo(() => ({
    fill_report_form: async (args: Record<string, any>) => {
      try {
        // Update form data using react-hook-form's setValue
        if (args.name) form.setValue('name', args.name)
        if (args.description) form.setValue('description', args.description)
        if (args.category) form.setValue('category', args.category)
        if (args.start_date) form.setValue('startDate', args.start_date)
        if (args.end_date) form.setValue('endDate', args.end_date)

        return {
          success: true,
          message: 'Form filled successfully',
          filled_fields: Object.keys(args),
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to fill form',
        }
      }
    },
  }), [form])

  // Use tool execution hook with auto-execution enabled
  const {
    isPaused,
    isExecuting,
    pendingTools,
  } = useAgnoToolExecution(toolHandlers, true)

  const onSubmit = (_data: FormValues) => {
    navigate('/reports')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Report</h2>
        <p className="text-muted-foreground">Create a new report with AI assistance</p>
      </div>

      {/* AI Tool Execution Status */}
      {(isPaused || isExecuting) && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isExecuting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">AI is filling the form</p>
                    <p className="text-sm text-muted-foreground">
                      Processing {pendingTools.length} tool{pendingTools.length !== 1 ? 's' : ''}...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">AI Assistant Ready</p>
                    <p className="text-sm text-muted-foreground">
                      Preparing to help with your report...
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Details</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI Assisted
          </Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Report Name</Label>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Enter report name"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            {/* Description Field */}
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Brief description of the report"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            {/* Category Field */}
            <Controller
              name="category"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Category</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <Controller
                name="startDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => date && field.onChange(date.toDateString())}
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* End Date */}
              <Controller
                name="endDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon />
                          {field.value ? format(new Date(field.value), "PPP") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => date && field.onChange(date.toDateString())}
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Create Report</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/reports')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
