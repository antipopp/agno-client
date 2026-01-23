/**
 * Generative UI Renderer
 *
 * Renders UI components based on specifications from the agent.
 * Supports both registry-based components and custom render functions.
 */

import type { UIComponentSpec } from "@antipopp/agno-types";
import React from "react";
import { getCustomRender } from "../hooks/useAgnoToolExecution";
import { getComponentRegistry } from "../utils/component-registry";

export interface GenerativeUIRendererProps {
  /** The UI component specification to render */
  spec: UIComponentSpec;
  /** Optional className for styling */
  className?: string;
  /** Error boundary fallback */
  onError?: (error: Error) => void;
}

/**
 * Error Boundary for UI rendering errors
 */
class UIErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    onError?: (error: Error) => void;
    fallback?: React.ReactNode;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "[GenerativeUIRenderer] Error rendering component:",
      error,
      errorInfo
    );
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Failed to render UI component</p>
            <p className="mt-1 text-sm">
              {this.state.error?.message || "Unknown error"}
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Main Generative UI Renderer component
 */
export function GenerativeUIRenderer({
  spec,
  className,
  onError,
}: GenerativeUIRendererProps): React.ReactElement {
  const registry = getComponentRegistry();

  // Handle custom render functions
  if (spec.type === "custom") {
    const customSpec = spec as any;
    if (customSpec.renderKey) {
      const renderFn = getCustomRender(customSpec.renderKey);
      if (renderFn) {
        return (
          <UIErrorBoundary onError={onError}>
            <div className={className}>{renderFn(customSpec.props || {})}</div>
          </UIErrorBoundary>
        );
      }
    }
    // Fallback if custom render not found
    return (
      <div
        className={`rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800 ${className || ""}`}
      >
        <p className="font-semibold">Custom component not available</p>
        <p className="mt-1 text-sm">
          The custom render function for this component is not available.
        </p>
      </div>
    );
  }

  // Handle chart components
  if (spec.type === "chart") {
    const chartSpec = spec as any;
    const chartType = `chart:${chartSpec.component}`;

    if (registry.has(chartType)) {
      const ChartRenderer = registry.get(chartType)!;
      return (
        <UIErrorBoundary onError={onError}>
          <div className={className}>
            {chartSpec.title && (
              <h3 className="mb-2 font-semibold">{chartSpec.title}</h3>
            )}
            {chartSpec.description && (
              <p className="mb-4 text-gray-600 text-sm">
                {chartSpec.description}
              </p>
            )}
            <ChartRenderer {...chartSpec.props} />
          </div>
        </UIErrorBoundary>
      );
    }

    // Fallback: render data as JSON
    return (
      <div
        className={`rounded-md border border-gray-300 p-4 ${className || ""}`}
      >
        <p className="mb-2 font-semibold">{chartSpec.title || "Chart Data"}</p>
        {chartSpec.description && (
          <p className="mb-2 text-gray-600 text-sm">{chartSpec.description}</p>
        )}
        <pre className="overflow-auto rounded bg-gray-100 p-2 text-xs">
          {JSON.stringify(chartSpec.props.data, null, 2)}
        </pre>
      </div>
    );
  }

  // Handle card grid
  if (spec.type === "card-grid") {
    const cardGridSpec = spec as any;
    if (registry.has("card-grid")) {
      const CardGridRenderer = registry.get("card-grid")!;
      return (
        <UIErrorBoundary onError={onError}>
          <div className={className}>
            {cardGridSpec.title && (
              <h3 className="mb-2 font-semibold">{cardGridSpec.title}</h3>
            )}
            {cardGridSpec.description && (
              <p className="mb-4 text-gray-600 text-sm">
                {cardGridSpec.description}
              </p>
            )}
            <CardGridRenderer {...cardGridSpec.props} />
          </div>
        </UIErrorBoundary>
      );
    }
  }

  // Handle table
  if (spec.type === "table") {
    const tableSpec = spec as any;
    if (registry.has("table")) {
      const TableRenderer = registry.get("table")!;
      return (
        <UIErrorBoundary onError={onError}>
          <div className={className}>
            {tableSpec.title && (
              <h3 className="mb-2 font-semibold">{tableSpec.title}</h3>
            )}
            {tableSpec.description && (
              <p className="mb-4 text-gray-600 text-sm">
                {tableSpec.description}
              </p>
            )}
            <TableRenderer {...tableSpec.props} />
          </div>
        </UIErrorBoundary>
      );
    }
  }

  // Handle markdown
  if (spec.type === "markdown") {
    const markdownSpec = spec as any;
    if (registry.has("markdown")) {
      const MarkdownRenderer = registry.get("markdown")!;
      return (
        <UIErrorBoundary onError={onError}>
          <div className={className}>
            <MarkdownRenderer {...markdownSpec.props} />
          </div>
        </UIErrorBoundary>
      );
    }
    // Fallback: render as plain text
    return <div className={className}>{markdownSpec.props.content}</div>;
  }

  // Handle artifact (container with multiple children)
  if (spec.type === "artifact") {
    const artifactSpec = spec as any;
    return (
      <UIErrorBoundary onError={onError}>
        <div className={`rounded-md border p-4 ${className || ""}`}>
          {artifactSpec.title && (
            <h3 className="mb-4 font-semibold">{artifactSpec.title}</h3>
          )}
          {artifactSpec.description && (
            <p className="mb-4 text-gray-600 text-sm">
              {artifactSpec.description}
            </p>
          )}
          <div className="space-y-4">
            {artifactSpec.props.content?.map(
              (childSpec: UIComponentSpec, index: number) => (
                <GenerativeUIRenderer
                  key={index}
                  onError={onError}
                  spec={childSpec}
                />
              )
            )}
          </div>
        </div>
      </UIErrorBoundary>
    );
  }

  // Unknown type fallback
  return (
    <div className={`rounded-md border border-gray-300 p-4 ${className || ""}`}>
      <p className="font-semibold">Unsupported UI component</p>
      <p className="mt-1 text-gray-600 text-sm">Component type: {spec.type}</p>
    </div>
  );
}
