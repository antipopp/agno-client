import type {
  ArtifactComponentSpec,
  CardGridComponentSpec,
  ChartComponentSpec,
  CustomComponentSpec,
  MarkdownComponentSpec,
  TableComponentSpec,
  UIComponentSpec,
} from "@antipopp/agno-types";
import type React from "react";
import { getCustomRender } from "../hooks/useAgnoToolExecution";
import { getComponentRegistry } from "../utils/component-registry";
import {
  CustomRenderContent,
  getSpecKey,
  joinClassNames,
  type RendererContext,
  renderFromRegistry,
  renderHeader,
  UIErrorBoundary,
} from "./GenerativeUIRenderer.shared";

function renderCustomSpec(
  spec: CustomComponentSpec,
  context: RendererContext
): React.ReactElement {
  const renderFn = getCustomRender(spec.renderKey);
  if (renderFn) {
    return (
      <UIErrorBoundary onError={context.onError}>
        <CustomRenderContent
          className={context.className}
          props={spec.props ?? {}}
          renderFn={renderFn}
        />
      </UIErrorBoundary>
    );
  }

  return (
    <div
      className={joinClassNames(
        "rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800",
        context.className
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
  context: RendererContext
): React.ReactElement {
  const registry = getComponentRegistry();
  const chartType = `chart:${spec.component}`;
  const chartRenderer = registry.get(chartType);
  const renderedChart = renderFromRegistry(
    chartRenderer,
    spec.props as Record<string, unknown>
  );

  if (renderedChart !== undefined) {
    return (
      <UIErrorBoundary onError={context.onError}>
        <div className={context.className}>
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
        context.className
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
  context: RendererContext
): React.ReactElement {
  const registry = getComponentRegistry();
  const cardGridRenderer = registry.get("card-grid");
  const renderedGrid = renderFromRegistry(
    cardGridRenderer,
    spec.props as Record<string, unknown>
  );

  if (renderedGrid === undefined) {
    return renderUnsupportedSpec(spec, context);
  }

  return (
    <UIErrorBoundary onError={context.onError}>
      <div className={context.className}>
        {renderHeader(spec.title, spec.description)}
        {renderedGrid}
      </div>
    </UIErrorBoundary>
  );
}

function renderTableSpec(
  spec: TableComponentSpec,
  context: RendererContext
): React.ReactElement {
  const registry = getComponentRegistry();
  const tableRenderer = registry.get("table");
  const renderedTable = renderFromRegistry(
    tableRenderer,
    spec.props as Record<string, unknown>
  );

  if (renderedTable === undefined) {
    return renderUnsupportedSpec(spec, context);
  }

  return (
    <UIErrorBoundary onError={context.onError}>
      <div className={context.className}>
        {renderHeader(spec.title, spec.description)}
        {renderedTable}
      </div>
    </UIErrorBoundary>
  );
}

function renderMarkdownSpec(
  spec: MarkdownComponentSpec,
  context: RendererContext
): React.ReactElement {
  const registry = getComponentRegistry();
  const markdownRenderer = registry.get("markdown");
  const renderedMarkdown = renderFromRegistry(
    markdownRenderer,
    spec.props as Record<string, unknown>
  );

  if (renderedMarkdown === undefined) {
    return <div className={context.className}>{spec.props.content}</div>;
  }

  return (
    <UIErrorBoundary onError={context.onError}>
      <div className={context.className}>{renderedMarkdown}</div>
    </UIErrorBoundary>
  );
}

function renderArtifactSpec(
  spec: ArtifactComponentSpec,
  context: RendererContext
): React.ReactElement {
  return (
    <UIErrorBoundary onError={context.onError}>
      <div
        className={joinClassNames("rounded-md border p-4", context.className)}
      >
        {spec.title ? (
          <h3 className="mb-4 font-semibold">{spec.title}</h3>
        ) : null}
        {spec.description ? (
          <p className="mb-4 text-gray-600 text-sm">{spec.description}</p>
        ) : null}
        <div className="space-y-4">
          {spec.props.content.map((childSpec) =>
            context.renderChild(
              childSpec,
              getSpecKey(childSpec),
              context.onError
            )
          )}
        </div>
      </div>
    </UIErrorBoundary>
  );
}

function renderUnsupportedSpec(
  spec: UIComponentSpec,
  context: RendererContext
): React.ReactElement {
  return (
    <div
      className={joinClassNames(
        "rounded-md border border-gray-300 p-4",
        context.className
      )}
    >
      <p className="font-semibold">Unsupported UI component</p>
      <p className="mt-1 text-gray-600 text-sm">Component type: {spec.type}</p>
    </div>
  );
}

export function renderComponentSpec(
  spec: UIComponentSpec,
  context: RendererContext
): React.ReactElement {
  switch (spec.type) {
    case "custom":
      return renderCustomSpec(spec, context);
    case "chart":
      return renderChartSpec(spec, context);
    case "card-grid":
      return renderCardGridSpec(spec, context);
    case "table":
      return renderTableSpec(spec, context);
    case "markdown":
      return renderMarkdownSpec(spec, context);
    case "artifact":
      return renderArtifactSpec(spec, context);
    default:
      return renderUnsupportedSpec(spec, context);
  }
}
