/**
 * Generative UI Renderer
 *
 * Renders UI components based on specifications from the agent.
 * Supports both registry-based components and custom render functions.
 */

import type { UIComponentSpec } from "@antipopp/agno-types";
import type React from "react";
import { renderComponentSpec } from "./GenerativeUIRenderer.renderers";

export interface GenerativeUIRendererProps {
  /** The UI component specification to render */
  spec: UIComponentSpec;
  /** Optional className for styling */
  className?: string;
  /** Error boundary fallback */
  onError?: (error: Error) => void;
}

/**
 * Main Generative UI Renderer component
 */
export function GenerativeUIRenderer({
  spec,
  className,
  onError,
}: GenerativeUIRendererProps): React.ReactElement {
  return renderComponentSpec(spec, {
    className,
    onError,
    renderChild: (childSpec, key, childOnError) => (
      <GenerativeUIRenderer key={key} onError={childOnError} spec={childSpec} />
    ),
  });
}
