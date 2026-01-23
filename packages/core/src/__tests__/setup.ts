import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test (for test-specific overrides)
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
