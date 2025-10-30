import { ChatMessage } from '@antipopp/agno-types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { User, Bot, AlertCircle, Wrench, Lightbulb, FileText, Image as ImageIcon, Video, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageItemProps {
  message: ChatMessage
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const isAgent = message.role === 'agent'
  const isSystem = message.role === 'system'
  const hasError = message.streamingError

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser && 'bg-primary text-primary-foreground',
          isAgent && 'bg-secondary text-secondary-foreground',
          isSystem && 'bg-muted text-muted-foreground'
        )}
      >
        {isUser && <User className="h-4 w-4" />}
        {isAgent && <Bot className="h-4 w-4" />}
        {isSystem && <AlertCircle className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <Card className={cn('flex-1 max-w-[80%]', hasError && 'border-destructive')}>
        <CardContent className="p-4 space-y-3">
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isUser ? 'default' : 'secondary'}>
              {message.role}
            </Badge>
            {hasError && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>

          {/* Main Content */}
          {message.content && (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          )}

          {/* Tool Calls */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4" />
                  Tool Calls ({message.tool_calls.length})
                </div>
                <Accordion type="multiple" className="w-full">
                  {message.tool_calls.map((tool, idx) => (
                    <AccordionItem key={tool.tool_call_id || idx} value={`tool-${idx}`}>
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={tool.tool_call_error ? 'destructive' : 'outline'}>
                            {tool.tool_name}
                          </Badge>
                          {tool.metrics && (
                            <span className="text-xs text-muted-foreground">
                              {tool.metrics.time}ms
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-xs">
                        {/* Tool Args */}
                        <div>
                          <div className="font-medium mb-1">Arguments:</div>
                          <pre className="bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(tool.tool_args, null, 2)}
                          </pre>
                        </div>
                        {/* Tool Result */}
                        {tool.content && (
                          <div>
                            <div className="font-medium mb-1">Result:</div>
                            <pre className="bg-muted p-2 rounded overflow-auto max-h-40">
                              {tool.content}
                            </pre>
                          </div>
                        )}
                        {tool.tool_call_error && (
                          <Badge variant="destructive" className="w-full justify-center">
                            Tool execution failed
                          </Badge>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </>
          )}

          {/* Reasoning Steps */}
          {message.extra_data?.reasoning_steps && message.extra_data.reasoning_steps.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4" />
                  Reasoning ({message.extra_data.reasoning_steps.length} steps)
                </div>
                <Accordion type="multiple" className="w-full">
                  {message.extra_data.reasoning_steps.map((step, idx) => (
                    <AccordionItem key={idx} value={`reasoning-${idx}`}>
                      <AccordionTrigger className="text-sm py-2">
                        {step.title || `Step ${idx + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-xs">
                        {step.action && (
                          <div>
                            <span className="font-medium">Action:</span> {step.action}
                          </div>
                        )}
                        {step.reasoning && (
                          <div>
                            <span className="font-medium">Reasoning:</span> {step.reasoning}
                          </div>
                        )}
                        {step.result && (
                          <div>
                            <span className="font-medium">Result:</span> {step.result}
                          </div>
                        )}
                        {step.confidence !== undefined && (
                          <div>
                            <span className="font-medium">Confidence:</span> {(step.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </>
          )}

          {/* References */}
          {message.extra_data?.references && message.extra_data.references.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  References ({message.extra_data.references.length})
                </div>
                <div className="space-y-2">
                  {message.extra_data.references.map((refData, idx) => (
                    <div key={idx} className="text-xs space-y-1">
                      {refData.query && (
                        <div className="font-medium">Query: {refData.query}</div>
                      )}
                      {refData.references.map((ref, refIdx) => (
                        <div key={refIdx} className="bg-muted p-2 rounded">
                          <div className="italic mb-1">"{ref.content}"</div>
                          <div className="text-muted-foreground">
                            Source: {ref.name} (chunk {ref.meta_data.chunk}/{ref.meta_data.chunk_size})
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Images */}
          {message.images && message.images.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  Images ({message.images.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {message.images.map((img, idx) => (
                    <div key={idx} className="space-y-1">
                      <img
                        src={img.url}
                        alt={img.revised_prompt || 'Generated image'}
                        className="w-full rounded border"
                      />
                      {img.revised_prompt && (
                        <p className="text-xs text-muted-foreground italic">
                          {img.revised_prompt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Videos */}
          {message.videos && message.videos.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Video className="h-4 w-4" />
                  Videos ({message.videos.length})
                </div>
                <div className="space-y-2">
                  {message.videos.map((video, idx) => (
                    <div key={idx}>
                      {video.url ? (
                        <video src={video.url} controls className="w-full rounded border" />
                      ) : (
                        <div className="bg-muted p-2 rounded text-xs">
                          Video ID: {video.id} (ETA: {video.eta}s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Audio */}
          {message.audio && message.audio.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Music className="h-4 w-4" />
                  Audio ({message.audio.length})
                </div>
                <div className="space-y-2">
                  {message.audio.map((audio, idx) => (
                    <div key={idx}>
                      {audio.url ? (
                        <audio src={audio.url} controls className="w-full" />
                      ) : audio.base64_audio ? (
                        <audio
                          src={`data:${audio.mime_type || 'audio/wav'};base64,${audio.base64_audio}`}
                          controls
                          className="w-full"
                        />
                      ) : (
                        <div className="bg-muted p-2 rounded text-xs">Audio data unavailable</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Response Audio (TTS) */}
          {message.response_audio && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Music className="h-4 w-4" />
                  Response Audio
                </div>
                {message.response_audio.transcript && (
                  <div className="text-xs italic bg-muted p-2 rounded">
                    "{message.response_audio.transcript}"
                  </div>
                )}
                {message.response_audio.content && (
                  <audio
                    src={`data:audio/wav;base64,${message.response_audio.content}`}
                    controls
                    className="w-full"
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
