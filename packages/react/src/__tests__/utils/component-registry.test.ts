import { afterEach, describe, expect, it } from "vitest";
import {
  ComponentRegistry,
  type ComponentRenderer,
  getChartComponent,
  getComponentRegistry,
  registerChartComponent,
} from "../../utils/component-registry";

const renderer: ComponentRenderer = (props) => String(props.label);
const alternateRenderer: ComponentRenderer = (props) => Number(props.value);

afterEach(() => {
  ComponentRegistry.resetInstance();
});

describe("ComponentRegistry", () => {
  it("should register, get, and unregister component renderers", () => {
    const registry = getComponentRegistry();

    registry.register("metric", renderer);

    expect(registry.has("metric")).toBe(true);
    expect(registry.get("metric")).toBe(renderer);

    registry.unregister("metric");

    expect(registry.has("metric")).toBe(false);
    expect(registry.get("metric")).toBeUndefined();
  });

  it("should clear registered renderers", () => {
    const registry = getComponentRegistry();

    registry.register("metric", renderer);
    registry.register("summary", alternateRenderer);

    registry.clear();

    expect(registry.getRegisteredTypes()).toEqual([]);
  });

  it("should reset the singleton to a fresh registry", () => {
    const registry = getComponentRegistry();
    registry.register("metric", renderer);

    ComponentRegistry.resetInstance();
    const freshRegistry = getComponentRegistry();

    expect(freshRegistry).not.toBe(registry);
    expect(freshRegistry.has("metric")).toBe(false);

    freshRegistry.register("metric", alternateRenderer);
    expect(freshRegistry.get("metric")).toBe(alternateRenderer);
  });

  it("should register and get chart components with chart namespacing", () => {
    registerChartComponent("BarChart", renderer);

    expect(getChartComponent("BarChart")).toBe(renderer);
    expect(getComponentRegistry().get("chart:BarChart")).toBe(renderer);
  });
});
