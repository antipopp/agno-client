import type { ChartComponentSpec, UIComponentSpec } from "@antipopp/agno-types";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerativeUIRenderer } from "../../components/GenerativeUIRenderer";
import { processToolResult } from "../../hooks/useAgnoToolExecution";
import {
  ComponentRegistry,
  getComponentRegistry,
} from "../../utils/component-registry";

const toolCall = {
  role: "tool",
  content: null,
  tool_call_id: "tool-call-1",
  tool_name: "render_ui",
  tool_args: {},
  tool_call_error: false,
  metrics: { time: 0 },
  created_at: 1_700_000_000,
} as const;

afterEach(() => {
  ComponentRegistry.resetInstance();
  vi.restoreAllMocks();
});

describe("GenerativeUIRenderer", () => {
  it("should route custom renderer errors through the fallback and onError", () => {
    const renderError = new Error("custom render failed");
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { uiComponent } = processToolResult(
      {
        data: "custom data",
        ui: {
          type: "custom",
          render: () => {
            throw renderError;
          },
        },
      },
      toolCall
    );

    if (!(uiComponent && uiComponent.type === "custom")) {
      throw new Error("Expected custom UI component");
    }

    render(<GenerativeUIRenderer onError={onError} spec={uiComponent} />);

    expect(screen.getByText("Failed to render UI component")).toBeDefined();
    expect(screen.getByText("custom render failed")).toBeDefined();
    expect(onError).toHaveBeenCalledWith(renderError);
  });

  it("should render registered falsy ReactNode output instead of chart fallback", () => {
    getComponentRegistry().register("chart:BarChart", () => 0);
    const spec: ChartComponentSpec = {
      type: "chart",
      component: "BarChart",
      props: {
        data: [{ label: "A", value: 1 }],
      },
    };

    render(<GenerativeUIRenderer spec={spec} />);

    expect(screen.getByText("0")).toBeDefined();
    expect(screen.queryByText("Chart Data")).toBeNull();
  });

  it("should render registered null output without replacing it with unsupported fallback", () => {
    getComponentRegistry().register("card-grid", () => null);
    const spec: UIComponentSpec = {
      type: "card-grid",
      props: {
        cards: [],
      },
    };

    render(<GenerativeUIRenderer spec={spec} />);

    expect(screen.queryByText("Unsupported UI component")).toBeNull();
  });
});
