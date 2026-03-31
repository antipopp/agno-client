/**
 * Generative UI Components
 *
 * Exports all generative UI renderers and sets up component registration.
 */

import { getComponentRegistry } from "@antipopp/agno-react";
import { CardGridRenderer } from "./CardGridRenderer";
import {
  AreaChartRenderer,
  BarChartRenderer,
  LineChartRenderer,
  PieChartRenderer,
} from "./ChartRenderer";

// Export renderers
export {
  AreaChartRenderer,
  BarChartRenderer,
  CardGridRenderer,
  LineChartRenderer,
  PieChartRenderer,
};

/**
 * Register all generative UI components
 * Call this once at app startup
 */
export function registerGenerativeUIComponents() {
  const registry = getComponentRegistry();
  const renderBarChart = (props: Record<string, unknown>) =>
    BarChartRenderer(props as Parameters<typeof BarChartRenderer>[0]);
  const renderLineChart = (props: Record<string, unknown>) =>
    LineChartRenderer(props as Parameters<typeof LineChartRenderer>[0]);
  const renderAreaChart = (props: Record<string, unknown>) =>
    AreaChartRenderer(props as Parameters<typeof AreaChartRenderer>[0]);
  const renderPieChart = (props: Record<string, unknown>) =>
    PieChartRenderer(props as Parameters<typeof PieChartRenderer>[0]);
  const renderCardGrid = (props: Record<string, unknown>) =>
    CardGridRenderer(props as Parameters<typeof CardGridRenderer>[0]);

  // Register chart components
  registry.register("chart:BarChart", renderBarChart);
  registry.register("chart:LineChart", renderLineChart);
  registry.register("chart:AreaChart", renderAreaChart);
  registry.register("chart:PieChart", renderPieChart);

  // Register card grid
  registry.register("card-grid", renderCardGrid);
}
