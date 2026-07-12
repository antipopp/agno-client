import type {
  CustomRenderFunction,
  UIComponentSpec,
} from "@antipopp/agno-types";
import React from "react";
import type { ComponentRenderer } from "../utils/component-registry";

interface UIErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

interface UIErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export type RenderChild = (
  spec: UIComponentSpec,
  key: string,
  onError: ((error: Error) => void) | undefined
) => React.ReactElement;

export interface RendererContext {
  readonly className: string | undefined;
  readonly onError: ((error: Error) => void) | undefined;
  readonly renderChild: RenderChild;
}

export class UIErrorBoundary extends React.Component<
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

export function joinClassNames(
  ...classNames: Array<string | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function renderHeader(
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

export function renderFromRegistry(
  renderer: ComponentRenderer | undefined,
  props: Record<string, unknown>
): React.ReactNode {
  if (!renderer) {
    return undefined;
  }

  return renderer(props);
}

interface CustomRenderContentProps {
  readonly className: string | undefined;
  readonly props: Record<string, unknown>;
  readonly renderFn: CustomRenderFunction;
}

export function CustomRenderContent({
  className,
  props,
  renderFn,
}: CustomRenderContentProps): React.ReactElement {
  const renderedContent = renderFn(props) as React.ReactNode;

  return <div className={className}>{renderedContent}</div>;
}

export function getSpecKey(spec: UIComponentSpec): string {
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
