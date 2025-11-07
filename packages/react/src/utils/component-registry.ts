/**
 * Component Registry for Generative UI
 *
 * Maps component specifications to actual React components.
 * Allows registering custom components at runtime.
 */

/**
 * Component renderer function type
 */
export type ComponentRenderer = (props: any) => any; // React.ReactNode in React context

/**
 * Component registry class
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private components: Map<string, ComponentRenderer> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Register a component renderer
   */
  register(type: string, renderer: ComponentRenderer): void {
    this.components.set(type, renderer);
  }

  /**
   * Register multiple components at once
   */
  registerBatch(components: Record<string, ComponentRenderer>): void {
    Object.entries(components).forEach(([type, renderer]) => {
      this.register(type, renderer);
    });
  }

  /**
   * Get a registered component renderer
   */
  get(type: string): ComponentRenderer | undefined {
    return this.components.get(type);
  }

  /**
   * Check if a component is registered
   */
  has(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Unregister a component
   */
  unregister(type: string): void {
    this.components.delete(type);
  }

  /**
   * Get all registered component types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.components.clear();
  }
}

/**
 * Get the global component registry instance
 */
export function getComponentRegistry(): ComponentRegistry {
  return ComponentRegistry.getInstance();
}

/**
 * Helper to register a chart component
 */
export function registerChartComponent(name: string, renderer: ComponentRenderer): void {
  getComponentRegistry().register(`chart:${name}`, renderer);
}

/**
 * Helper to get a chart component
 */
export function getChartComponent(name: string): ComponentRenderer | undefined {
  return getComponentRegistry().get(`chart:${name}`);
}
