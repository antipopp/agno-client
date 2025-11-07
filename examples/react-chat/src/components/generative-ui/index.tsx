/**
 * Generative UI Components
 *
 * Exports all generative UI renderers and sets up component registration.
 */

import { getComponentRegistry } from '@antipopp/agno-react';
import {
  BarChartRenderer,
  LineChartRenderer,
  AreaChartRenderer,
  PieChartRenderer,
} from './ChartRenderer';
import { CardGridRenderer } from './CardGridRenderer';

// Export renderers
export {
  BarChartRenderer,
  LineChartRenderer,
  AreaChartRenderer,
  PieChartRenderer,
  CardGridRenderer,
};

/**
 * Register all generative UI components
 * Call this once at app startup
 */
export function registerGenerativeUIComponents() {
  const registry = getComponentRegistry();

  // Register chart components
  registry.register('chart:BarChart', BarChartRenderer);
  registry.register('chart:LineChart', LineChartRenderer);
  registry.register('chart:AreaChart', AreaChartRenderer);
  registry.register('chart:PieChart', PieChartRenderer);

  // Register card grid
  registry.register('card-grid', CardGridRenderer);
}
