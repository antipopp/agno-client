/**
 * Generative UI Renderer
 *
 * Renders UI components based on specifications from the agent.
 * Supports both registry-based components and custom render functions.
 */

import type {
  ArtifactComponentSpec,
  CardGridComponentSpec,
  ChartComponentSpec,
  CustomComponentSpec,
  MarkdownComponentSpec,
  TableComponentSpec,
  UIComponentSpec,
} from "@antipopp/agno-types";
import React from "react";
import { getCustomRender } from "../hooks/useAgnoToolExecution";
import type { ComponentRenderer } from "../utils/component-registry";
import { getComponentRegistry } from "../utils/component-registry";

export interface GenerativeUIRendererProps {
  /** The UI component specification to render */
  spec: UIComponentSpec;
  /** Optional className for styling */
  className?: string;
  /** Error boundary fallback */
  onError?: (error: Error) => void;
}

interface UIErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

interface UIErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for UI rendering errors
 */
class UIErrorBoundary extends React.Component<
  UIErrorBoundaryProps,
  UIErrorBoundaryState
> {
  constructor(props: UIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): UIErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      "[GenerativeUIRenderer] Error rendering component:",
      error,
      errorInfo
    );
    this.props.onError?.(error);
  }

  render(): React.ReactNode {
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

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function renderHeader(
  title: string | undefined,
  description: string | undefined
): React.ReactNode {
  return (
    <>
      {title ? <h3 className="mb-2 font-semibold">{title}</h3> : null}
      {description ? (
        <p className="mb-4 text-gray-600 text-sm">{description}</p>
      ) : null}
    </>
  );
}

function renderFromRegistry(
  renderer: ComponentRenderer | undefined,
  props: Record<string, unknown>
): React.ReactNode {
  if (!renderer) {
    return undefined;
  }

  return renderer(props);
}

function getSpecKey(spec: UIComponentSpec): string {
  switch (spec.type) {
    case "chart":
      return `${spec.type}-${spec.component}-${spec.title ?? "untitled"}-${spec.props.data.length}`;
    case "card-grid":
      return `${spec.type}-${spec.title ?? "untitled"}-${spec.props.cards.map((card) => card.id).join("|")}`;
    case "table":
      return `${spec.type}-${spec.title ?? "untitled"}-${spec.props.columns.map((column) => column.key).join("|")}`;
    case "markdown":
      return `${spec.type}-${spec.props.content.slice(0, 48)}`;
    case "custom":
      return `${spec.type}-${spec.renderKey}`;
    case "artifact":
      return `${spec.type}-${spec.title ?? "untitled"}-${spec.props.content.length}`;
    default:
      return "unknown-spec";
  }
}

function renderCustomSpec(
  spec: CustomComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  const renderFn = getCustomRender(spec.renderKey);
  if (renderFn) {
    return (
      <UIErrorBoundary onError={onError}>
        <div className={className}>{renderFn(spec.props || {})}</div>
      </UIErrorBoundary>
    );
  }

  return (
    <div
      className={joinClassNames(
        "rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800",
        className
      )}
    >
      <p className="font-semibold">Custom component not available</p>
      <p className="mt-1 text-sm">
        The custom render function for this component is not available.
      </p>
    </div>
  );
}

function renderChartSpec(
  spec: ChartComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  const registry = getComponentRegistry();
  const chartType = `chart:${spec.component}`;
  const chartRenderer = registry.get(chartType);
  const renderedChart = renderFromRegistry(
    chartRenderer,
    spec.props as Record<string, unknown>
  );

  if (renderedChart) {
    return (
      <UIErrorBoundary onError={onError}>
        <div className={className}>
          {renderHeader(spec.title, spec.description)}
          {renderedChart}
        </div>
      </UIErrorBoundary>
    );
  }

  return (
    <div
      className={joinClassNames(
        "rounded-md border border-gray-300 p-4",
        className
      )}
    >
      <p className="mb-2 font-semibold">{spec.title || "Chart Data"}</p>
      {spec.description ? (
        <p className="mb-2 text-gray-600 text-sm">{spec.description}</p>
      ) : null}
      <pre className="overflow-auto rounded bg-gray-100 p-2 text-xs">
        {JSON.stringify(spec.props.data, null, 2)}
      </pre>
    </div>
  );
}

function renderCardGridSpec(
  spec: CardGridComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  const registry = getComponentRegistry();
  const cardGridRenderer = registry.get("card-grid");
  const renderedGrid = renderFromRegistry(
    cardGridRenderer,
    spec.props as Record<string, unknown>
  );

  if (!renderedGrid) {
    return renderUnsupportedSpec(spec, className);
  }

  return (
    <UIErrorBoundary onError={onError}>
      <div className={className}>
        {renderHeader(spec.title, spec.description)}
        {renderedGrid}
      </div>
    </UIErrorBoundary>
  );
}

function renderTableSpec(
  spec: TableComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  const registry = getComponentRegistry();
  const tableRenderer = registry.get("table");
  const renderedTable = renderFromRegistry(
    tableRenderer,
    spec.props as Record<string, unknown>
  );

  if (!renderedTable) {
    return renderUnsupportedSpec(spec, className);
  }

  return (
    <UIErrorBoundary onError={onError}>
      <div className={className}>
        {renderHeader(spec.title, spec.description)}
        {renderedTable}
      </div>
    </UIErrorBoundary>
  );
}

function renderMarkdownSpec(
  spec: MarkdownComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  const registry = getComponentRegistry();
  const markdownRenderer = registry.get("markdown");
  const renderedMarkdown = renderFromRegistry(
    markdownRenderer,
    spec.props as Record<string, unknown>
  );

  if (!renderedMarkdown) {
    return <div className={className}>{spec.props.content}</div>;
  }

  return (
    <UIErrorBoundary onError={onError}>
      <div className={className}>{renderedMarkdown}</div>
    </UIErrorBoundary>
  );
}

function renderArtifactSpec(
  spec: ArtifactComponentSpec,
  className: string | undefined,
  onError: ((error: Error) => void) | undefined
): React.ReactElement {
  return (
    <UIErrorBoundary onError={onError}>
      <div className={joinClassNames("rounded-md border p-4", className)}>
        {spec.title ? (
          <h3 className="mb-4 font-semibold">{spec.title}</h3>
        ) : null}
        {spec.description ? (
          <p className="mb-4 text-gray-600 text-sm">{spec.description}</p>
        ) : null}
        <div className="space-y-4">
          {spec.props.content.map((childSpec) => (
            <GenerativeUIRenderer
              key={getSpecKey(childSpec)}
              onError={onError}
              spec={childSpec}
            />
          ))}
        </div>
      </div>
    </UIErrorBoundary>
  );
}

function renderUnsupportedSpec(
  spec: UIComponentSpec,
  className: string | undefined
): React.ReactElement {
  return (
    <div
      className={joinClassNames(
        "rounded-md border border-gray-300 p-4",
        className
      )}
    >
      <p className="font-semibold">Unsupported UI component</p>
      <p className="mt-1 text-gray-600 text-sm">Component type: {spec.type}</p>
    </div>
  );
}

/**
 * Main Generative UI Renderer component
 */
export function GenerativeUIRenderer({
  spec,
  className,
  onError,
}: GenerativeUIRendererProps): React.ReactElement {
  switch (spec.type) {
    case "custom":
      return renderCustomSpec(spec, className, onError);
    case "chart":
      return renderChartSpec(spec, className, onError);
    case "card-grid":
      return renderCardGridSpec(spec, className, onError);
    case "table":
      return renderTableSpec(spec, className, onError);
    case "markdown":
      return renderMarkdownSpec(spec, className, onError);
    case "artifact":
      return renderArtifactSpec(spec, className, onError);
    default:
      return renderUnsupportedSpec(spec, className);
  }
}
