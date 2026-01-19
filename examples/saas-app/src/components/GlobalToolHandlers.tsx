import { type ReactNode, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ToolHandlerProvider, type ToolHandler } from '@antipopp/agno-react'

interface GlobalToolHandlersProps {
  children: ReactNode
}

/**
 * Sets up global tool handlers with access to React Router navigation
 */
export function GlobalToolHandlers({ children }: GlobalToolHandlersProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const globalToolHandlers: Record<string, ToolHandler> = useMemo(
    () => ({
      fill_report_form: async (args: Record<string, any>) => {
        // If args is a string (YAML format), parse it to object
        let parsedArgs: any = args
        if (typeof args === 'string') {
          // Simple YAML-like parser for the specific format we're receiving
          try {
            const pairs = (args as string).split(', ')
            parsedArgs = {}
            for (const pair of pairs) {
              const [key, ...valueParts] = pair.split(': ')
              parsedArgs[key.trim()] = valueParts.join(': ').trim()
            }
          } catch (error) {
            console.error('Failed to parse YAML args:', error)
            return { success: false, error: 'Invalid args format' }
          }
        }

        // Store the form data in sessionStorage for the NewReport page to pick up
        sessionStorage.setItem('pendingReportData', JSON.stringify(parsedArgs))

        // Navigate to the new report page if not already there (using React Router)
        if (!location.pathname.includes('/reports/new')) {
          navigate('/reports/new')
          return {
            success: true,
            message: 'Navigating to report form...',
            navigated: true,
          }
        }

        // If already on the page, the local handler will pick it up
        return {
          success: true,
          message: 'Form data ready to be applied',
          ...parsedArgs,
        }
      },
    }),
    [navigate, location.pathname]
  )

  return <ToolHandlerProvider handlers={globalToolHandlers}>{children}</ToolHandlerProvider>
}
