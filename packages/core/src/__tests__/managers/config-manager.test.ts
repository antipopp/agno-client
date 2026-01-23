import type { AgnoClientConfig } from "@antipopp/agno-types";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfigManager } from "../../managers/config-manager";

describe("ConfigManager", () => {
  let manager: ConfigManager;
  const defaultConfig: AgnoClientConfig = {
    endpoint: "http://localhost:7777",
  };

  beforeEach(() => {
    manager = new ConfigManager(defaultConfig);
  });

  describe("constructor", () => {
    it("should initialize with provided config", () => {
      const config = manager.getConfig();
      expect(config.endpoint).toBe("http://localhost:7777");
    });

    it("should create a copy of input config (immutable)", () => {
      const inputConfig: AgnoClientConfig = { endpoint: "http://test.com" };
      const mgr = new ConfigManager(inputConfig);

      inputConfig.endpoint = "http://modified.com";

      expect(mgr.getEndpoint()).toBe("http://test.com");
    });
  });

  describe("getConfig", () => {
    it("should return a copy of config", () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe("updateConfig", () => {
    it("should update multiple fields", () => {
      manager.updateConfig({
        mode: "agent",
        agentId: "agent-123",
        authToken: "token",
      });

      expect(manager.getMode()).toBe("agent");
      expect(manager.getAgentId()).toBe("agent-123");
      expect(manager.getAuthToken()).toBe("token");
    });

    it("should preserve existing fields", () => {
      manager.updateConfig({ agentId: "agent-1" });
      manager.updateConfig({ teamId: "team-1" });

      expect(manager.getAgentId()).toBe("agent-1");
      expect(manager.getTeamId()).toBe("team-1");
    });
  });

  describe("endpoint methods", () => {
    it("should get and set endpoint", () => {
      expect(manager.getEndpoint()).toBe("http://localhost:7777");

      manager.setEndpoint("http://new-endpoint.com");
      expect(manager.getEndpoint()).toBe("http://new-endpoint.com");
    });
  });

  describe("authToken methods", () => {
    it("should get and set auth token", () => {
      expect(manager.getAuthToken()).toBeUndefined();

      manager.setAuthToken("my-token");
      expect(manager.getAuthToken()).toBe("my-token");

      manager.setAuthToken(undefined);
      expect(manager.getAuthToken()).toBeUndefined();
    });
  });

  describe("mode methods", () => {
    it("should default to agent mode", () => {
      expect(manager.getMode()).toBe("agent");
    });

    it("should get and set mode", () => {
      manager.setMode("team");
      expect(manager.getMode()).toBe("team");

      manager.setMode("agent");
      expect(manager.getMode()).toBe("agent");
    });
  });

  describe("entity ID methods", () => {
    it("should get and set agent ID", () => {
      manager.setAgentId("agent-123");
      expect(manager.getAgentId()).toBe("agent-123");
    });

    it("should get and set team ID", () => {
      manager.setTeamId("team-456");
      expect(manager.getTeamId()).toBe("team-456");
    });

    it("should get current entity ID based on mode", () => {
      manager.setMode("agent");
      manager.setAgentId("agent-123");
      manager.setTeamId("team-456");

      expect(manager.getCurrentEntityId()).toBe("agent-123");

      manager.setMode("team");
      expect(manager.getCurrentEntityId()).toBe("team-456");
    });
  });

  describe("dbId methods", () => {
    it("should get and set database ID", () => {
      expect(manager.getDbId()).toBeUndefined();

      manager.setDbId("db-123");
      expect(manager.getDbId()).toBe("db-123");
    });
  });

  describe("sessionId methods", () => {
    it("should get and set session ID", () => {
      expect(manager.getSessionId()).toBeUndefined();

      manager.setSessionId("session-123");
      expect(manager.getSessionId()).toBe("session-123");
    });
  });

  describe("userId methods", () => {
    it("should get and set user ID", () => {
      expect(manager.getUserId()).toBeUndefined();

      manager.setUserId("user-123");
      expect(manager.getUserId()).toBe("user-123");
    });
  });

  describe("headers methods", () => {
    it("should get and set custom headers", () => {
      expect(manager.getHeaders()).toBeUndefined();

      manager.setHeaders({ "X-Custom": "value" });
      expect(manager.getHeaders()).toEqual({ "X-Custom": "value" });
    });
  });

  describe("params methods", () => {
    it("should get and set custom params", () => {
      expect(manager.getParams()).toBeUndefined();

      manager.setParams({ version: "v2" });
      expect(manager.getParams()).toEqual({ version: "v2" });
    });
  });

  describe("getRunUrl", () => {
    it("should return null if no entity ID", () => {
      expect(manager.getRunUrl()).toBeNull();
    });

    it("should return agent run URL", () => {
      manager.setMode("agent");
      manager.setAgentId("agent-123");

      expect(manager.getRunUrl()).toBe(
        "http://localhost:7777/agents/agent-123/runs"
      );
    });

    it("should return team run URL", () => {
      manager.setMode("team");
      manager.setTeamId("team-456");

      expect(manager.getRunUrl()).toBe(
        "http://localhost:7777/teams/team-456/runs"
      );
    });

    it("should encode entity ID to prevent path traversal", () => {
      manager.setMode("agent");
      manager.setAgentId("agent/../../../etc/passwd");

      const url = manager.getRunUrl();
      expect(url).not.toContain("../");
      expect(url).toContain(encodeURIComponent("agent/../../../etc/passwd"));
    });

    it("should handle special characters in entity ID", () => {
      manager.setMode("agent");
      manager.setAgentId("agent with spaces & symbols");

      const url = manager.getRunUrl();
      expect(url).toContain("agent%20with%20spaces%20%26%20symbols");
    });
  });

  describe("buildRequestHeaders", () => {
    it("should return empty object if no headers configured", () => {
      const headers = manager.buildRequestHeaders();
      expect(headers).toEqual({});
    });

    it("should include global headers", () => {
      manager.setHeaders({ "X-Global": "global-value" });

      const headers = manager.buildRequestHeaders();
      expect(headers["X-Global"]).toBe("global-value");
    });

    it("should merge per-request headers with global headers", () => {
      manager.setHeaders({ "X-Global": "global-value" });

      const headers = manager.buildRequestHeaders({
        "X-Request": "request-value",
      });

      expect(headers["X-Global"]).toBe("global-value");
      expect(headers["X-Request"]).toBe("request-value");
    });

    it("should allow per-request headers to override global headers", () => {
      manager.setHeaders({ "X-Header": "global" });

      const headers = manager.buildRequestHeaders({ "X-Header": "request" });

      expect(headers["X-Header"]).toBe("request");
    });

    it("should add Authorization header from authToken", () => {
      manager.setAuthToken("my-secret-token");

      const headers = manager.buildRequestHeaders();

      expect(headers.Authorization).toBe("Bearer my-secret-token");
    });

    it("should override any Authorization header with authToken", () => {
      manager.setAuthToken("my-token");
      manager.setHeaders({ Authorization: "Bearer global-token" });

      const headers = manager.buildRequestHeaders({
        Authorization: "Bearer request-token",
      });

      expect(headers.Authorization).toBe("Bearer my-token");
    });
  });

  describe("buildQueryString", () => {
    it("should return empty URLSearchParams if no params configured", () => {
      const params = manager.buildQueryString();
      expect(params.toString()).toBe("");
    });

    it("should include global params", () => {
      manager.setParams({ version: "v2", locale: "en-US" });

      const params = manager.buildQueryString();

      expect(params.get("version")).toBe("v2");
      expect(params.get("locale")).toBe("en-US");
    });

    it("should merge per-request params with global params", () => {
      manager.setParams({ version: "v2" });

      const params = manager.buildQueryString({ debug: "true" });

      expect(params.get("version")).toBe("v2");
      expect(params.get("debug")).toBe("true");
    });

    it("should allow per-request params to override global params", () => {
      manager.setParams({ version: "v1" });

      const params = manager.buildQueryString({ version: "v2" });

      expect(params.get("version")).toBe("v2");
    });

    it("should return URLSearchParams instance", () => {
      const params = manager.buildQueryString({ test: "value" });

      expect(params).toBeInstanceOf(URLSearchParams);
      expect(params.toString()).toBe("test=value");
    });
  });
});
