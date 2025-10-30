import { Loader2 } from 'lucide-react'

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Agent is responding...</span>
    </div>
  )
}
