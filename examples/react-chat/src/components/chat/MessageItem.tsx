import { GenerativeUIRenderer } from "@antipopp/agno-react";
import type { ChatMessage } from "@antipopp/agno-types";
import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Music,
  Paperclip,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import { Artifact } from "@/components/ai-elements/artifact";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const hasError = message.streamingError;

  // Determine tool state for AI Elements Tool component
  const getToolState = (
    tool: NonNullable<ChatMessage["tool_calls"]>[0]
  ): "output-available" | "output-error" => {
    return tool.tool_call_error ? "output-error" : "output-available";
  };

  const renderAudioContent = (
    audio: NonNullable<ChatMessage["audio"]>[0]
  ): ReactNode => {
    if (audio.url) {
      return (
        <audio className="w-full" controls src={audio.url}>
          <track kind="captions" label="No captions available" srcLang="en" />
        </audio>
      );
    }

    if (audio.base64_audio) {
      return (
        <audio
          className="w-full"
          controls
          src={`data:${audio.mime_type || "audio/wav"};base64,${audio.base64_audio}`}
        >
          <track kind="captions" label="No captions available" srcLang="en" />
        </audio>
      );
    }

    return (
      <div className="rounded bg-muted p-2 text-xs">Audio data unavailable</div>
    );
  };

  // Extract tool calls with UI components for prominent rendering
  const toolsWithUI =
    message.tool_calls?.filter((tool) => tool.ui_component) || [];

  return (
    <Message
      className={cn(hasError && "opacity-80")}
      from={isUser ? "user" : "assistant"}
    >
      {/* Message Content */}
      <MessageContent
        className={cn("space-y-4", !isUser && "w-full")}
        variant="flat"
      >
        {/* Header: Role Badge and Timestamp */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="text-xs" variant={isUser ? "default" : "secondary"}>
            {message.role}
          </Badge>
          {hasError && (
            <Badge className="text-xs" variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
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
              if (!tool.ui_component) {
                return null;
              }

              const uiComponent = tool.ui_component;
              return (
                <div key={tool.tool_call_id}>
                  {uiComponent.layout === "artifact" ? (
                    <Artifact>
                      <GenerativeUIRenderer
                        className="w-full p-2"
                        spec={uiComponent}
                      />
                    </Artifact>
                  ) : (
                    <GenerativeUIRenderer
                      className="w-full"
                      spec={uiComponent}
                    />
                  )}
                </div>
              );
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
                <Tool
                  defaultOpen={idx === 0}
                  key={
                    tool.tool_call_id || `${tool.tool_name}-${tool.created_at}`
                  }
                >
                  <ToolHeader
                    state={getToolState(tool)}
                    title={tool.tool_name}
                    type="tool-use"
                  />
                  <ToolContent>
                    <ToolInput input={tool.tool_args} />

                    {/* Show text output if available (UI components are rendered prominently above) */}
                    {tool.content && (
                      <ToolOutput
                        errorText={
                          tool.tool_call_error
                            ? "Tool execution failed"
                            : undefined
                        }
                        output={tool.content}
                      />
                    )}
                  </ToolContent>
                </Tool>
              ))}
            </div>
          </>
        )}

        {/* Reasoning Steps */}
        {message.extra_data?.reasoning_steps &&
          message.extra_data.reasoning_steps.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Lightbulb className="h-4 w-4" />
                  Reasoning ({message.extra_data.reasoning_steps.length} steps)
                </div>
                <Accordion className="w-full" type="multiple">
                  {message.extra_data.reasoning_steps.map((step, idx) => (
                    <AccordionItem
                      key={`${step.title || "step"}-${step.result}-${step.reasoning}`}
                      value={`${step.title || "step"}-${step.result}-${step.reasoning}`}
                    >
                      <AccordionTrigger className="py-2 text-sm">
                        {step.title || `Step ${idx + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-xs">
                        {step.action && (
                          <div>
                            <span className="font-medium">Action:</span>{" "}
                            {step.action}
                          </div>
                        )}
                        {step.reasoning && (
                          <div>
                            <span className="font-medium">Reasoning:</span>{" "}
                            {step.reasoning}
                          </div>
                        )}
                        {step.result && (
                          <div>
                            <span className="font-medium">Result:</span>{" "}
                            {step.result}
                          </div>
                        )}
                        {step.confidence !== undefined && (
                          <div>
                            <span className="font-medium">Confidence:</span>{" "}
                            {(step.confidence * 100).toFixed(1)}%
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
        {message.extra_data?.references &&
          message.extra_data.references.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <FileText className="h-4 w-4" />
                  References ({message.extra_data.references.length})
                </div>
                <div className="space-y-2">
                  {message.extra_data.references.map((refData) => (
                    <div
                      className="space-y-1 text-xs"
                      key={`${refData.query || "reference"}-${refData.references.length}`}
                    >
                      {refData.query && (
                        <div className="font-medium">
                          Query: {refData.query}
                        </div>
                      )}
                      {refData.references.map((ref) => (
                        <div
                          className="rounded bg-muted p-2"
                          key={`${ref.name}-${ref.meta_data.chunk}-${ref.content.slice(0, 32)}`}
                        >
                          <div className="mb-1 italic">"{ref.content}"</div>
                          <div className="text-muted-foreground">
                            Source: {ref.name} (chunk {ref.meta_data.chunk}/
                            {ref.meta_data.chunk_size})
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
              <div className="flex items-center gap-2 font-medium text-sm">
                <ImageIcon className="h-4 w-4" />
                Images ({message.images.length})
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {message.images.map((img) => (
                  <div
                    className="max-w-sm space-y-1"
                    key={`${img.url}-${img.revised_prompt || ""}`}
                  >
                    <img
                      alt={img.revised_prompt || "Generated image"}
                      className="h-auto max-h-80 w-full rounded border bg-muted/20 object-contain"
                      height={1024}
                      src={img.url}
                      width={1024}
                    />
                    {img.revised_prompt && (
                      <p className="text-muted-foreground text-xs italic">
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
              <div className="flex items-center gap-2 font-medium text-sm">
                <Video className="h-4 w-4" />
                Videos ({message.videos.length})
              </div>
              <div className="space-y-2">
                {message.videos.map((video) => (
                  <div key={video.url || `video-${video.id}-${video.eta}`}>
                    {video.url ? (
                      <video
                        className="w-full rounded border"
                        controls
                        src={video.url}
                      >
                        <track
                          kind="captions"
                          label="No captions available"
                          srcLang="en"
                        />
                      </video>
                    ) : (
                      <div className="rounded bg-muted p-2 text-xs">
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
              <div className="flex items-center gap-2 font-medium text-sm">
                <Music className="h-4 w-4" />
                Audio ({message.audio.length})
              </div>
              <div className="space-y-2">
                {message.audio.map((audio) => (
                  <div
                    key={
                      audio.url ||
                      audio.id ||
                      audio.base64_audio?.slice(0, 24) ||
                      `${audio.mime_type || "audio"}-${audio.sample_rate || "na"}`
                    }
                  >
                    {renderAudioContent(audio)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Paperclip className="h-4 w-4" />
                Files ({message.files.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {message.files.map((file, index) => {
                  const label =
                    file.filename || file.name || `Attachment ${index + 1}`;
                  const key = `${label}-${file.mime_type || "file"}-${index}`;

                  if (file.url) {
                    return (
                      <a
                        className="rounded border bg-muted/40 px-3 py-1 text-xs transition-colors hover:bg-muted"
                        download={label}
                        href={file.url}
                        key={key}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {label}
                      </a>
                    );
                  }

                  return (
                    <div
                      className="rounded border bg-muted/40 px-3 py-1 text-xs"
                      key={key}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Response Audio (TTS) */}
        {message.response_audio && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Music className="h-4 w-4" />
                Response Audio
              </div>
              {message.response_audio.transcript && (
                <div className="rounded bg-muted p-2 text-xs italic">
                  "{message.response_audio.transcript}"
                </div>
              )}
              {message.response_audio.content && (
                <audio
                  className="w-full"
                  controls
                  src={`data:audio/wav;base64,${message.response_audio.content}`}
                >
                  <track
                    kind="captions"
                    label="No captions available"
                    srcLang="en"
                  />
                </audio>
              )}
            </div>
          </>
        )}
      </MessageContent>
    </Message>
  );
}
