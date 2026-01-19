import { Message, MessageContent } from '@/components/ai-elements/message'
import { Response } from '@/components/ai-elements/response'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ChatMessage } from '@antipopp/agno-types'
import { AlertCircle, FileText, Image as ImageIcon, Lightbulb, Music, Video } from 'lucide-react'
import { GenerativeUIRenderer } from '@antipopp/agno-react'
import { Artifact } from '@/components/ai-elements/artifact'

interface MessageItemProps {
  message: ChatMessage
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const hasError = message.streamingError

  // Determine tool state for AI Elements Tool component
  const getToolState = (tool: NonNullable<ChatMessage['tool_calls']>[0]): 'output-available' | 'output-error' => {
    return tool.tool_call_error ? 'output-error' : 'output-available'
  }

  // Extract tool calls with UI components for prominent rendering
  const toolsWithUI = message.tool_calls?.filter((tool) => (tool as any).ui_component) || []

  return (
    <Message from={isUser ? 'user' : 'assistant'} className={cn(hasError && 'opacity-80')}>
      {/* Message Content */}
      <MessageContent variant="flat" className={cn("space-y-4", !isUser && 'w-full')}>
        {/* Header: Role Badge and Timestamp */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant={isUser ? 'default' : 'secondary'} className="text-xs">
            {message.role}
          </Badge>
          {hasError && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          )}
          <span className="text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Rendered UI Components (from tool calls) - Prominently displayed before content */}
        {toolsWithUI.length > 0 && (
          <div className="space-y-4">
            {toolsWithUI.map((tool) => {
              const uiComponent = (tool as any).ui_component
              return (
                <div key={tool.tool_call_id}>
                  {uiComponent.layout === 'artifact' ? (
                    <Artifact>
                      <GenerativeUIRenderer
                        spec={uiComponent}
                        className="w-full p-2"
                      />
                    </Artifact>
                  ) : (
                    <GenerativeUIRenderer
                      spec={uiComponent}
                      className="w-full"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Main Content with Markdown Support */}
        {message.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Response>{message.content}</Response>
          </div>
        )}

        {/* Tool Calls using AI Elements Tool Component */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {message.tool_calls.map((tool, idx) => (
                <Tool key={tool.tool_call_id || idx} defaultOpen={idx === 0}>
                  <ToolHeader
                    title={tool.tool_name}
                    type="tool-use"
                    state={getToolState(tool)}
                  />
                  <ToolContent>
                    <ToolInput input={tool.tool_args} />

                    {/* Show text output if available (UI components are rendered prominently above) */}
                    {tool.content && (
                      <ToolOutput
                        output={tool.content}
                        errorText={tool.tool_call_error ? 'Tool execution failed' : undefined}
                      />
                    )}
                  </ToolContent>
                </Tool>
              ))}
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
      </MessageContent>
    </Message>
  )
}
