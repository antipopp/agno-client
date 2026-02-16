import { useAgnoActions, useAgnoClient } from "@antipopp/agno-react";
import type {
  AgentDetails,
  AgnoClientConfig,
  ClientState,
  TeamDetails,
} from "@antipopp/agno-types";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function ConfigPanel() {
  const client = useAgnoClient();
  const { initialize, updateConfig, isInitializing, error } = useAgnoActions();

  const [endpoint, setEndpoint] = useState(client.getConfig().endpoint);
  const [authToken, setAuthToken] = useState(
    client.getConfig().authToken || ""
  );
  const [mode, setMode] = useState<"agent" | "team">(
    client.getConfig().mode || "agent"
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [dbId, setDbId] = useState(client.getConfig().dbId || "");

  const [agents, setAgents] = useState<AgentDetails[]>([]);
  const [teams, setTeams] = useState<TeamDetails[]>([]);
  const [isEndpointActive, setIsEndpointActive] = useState(false);

  // Listen to state changes
  useEffect(() => {
    const handleStateChange = (state: ClientState) => {
      setIsEndpointActive(state.isEndpointActive);
      setAgents(state.agents || []);
      setTeams(state.teams || []);
    };

    const handleConfigChange = (config: AgnoClientConfig) => {
      setEndpoint(config.endpoint);
      setAuthToken(config.authToken || "");
      setMode(config.mode || "agent");
      setDbId(config.dbId || "");

      if (config.mode === "agent" && config.agentId) {
        setSelectedEntityId(config.agentId);
      } else if (config.mode === "team" && config.teamId) {
        setSelectedEntityId(config.teamId);
      }
    };

    client.on("state:change", handleStateChange);
    client.on("config:change", handleConfigChange);

    // Get initial state
    const state = client.getState();
    const config = client.getConfig();
    handleStateChange(state);
    handleConfigChange(config);

    return () => {
      client.off("state:change", handleStateChange);
      client.off("config:change", handleConfigChange);
    };
  }, [client]);

  const handleInitialize = async () => {
    try {
      await initialize();
      toast.success("Initialized successfully");
    } catch (err) {
      toast.error(`Initialization failed: ${error || err}`);
    }
  };

  const handleApplyConfig = () => {
    const updates: Partial<AgnoClientConfig> = {
      endpoint,
      authToken: authToken || undefined,
      mode,
      dbId: dbId || undefined,
    };

    if (mode === "agent") {
      updates.agentId = selectedEntityId || undefined;
      updates.teamId = undefined;
    } else {
      updates.teamId = selectedEntityId || undefined;
      updates.agentId = undefined;
    }

    updateConfig(updates);
    toast.success("Configuration updated");
  };

  const entities = mode === "agent" ? agents : teams;
  const entityLabel = mode === "agent" ? "Agent" : "Team";

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Configure your Agno connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint Status */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Endpoint Status</span>
            <Badge variant={isEndpointActive ? "default" : "destructive"}>
              {isEndpointActive ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Inactive
                </>
              )}
            </Badge>
          </div>

          <Separator />

          {/* Endpoint URL */}
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:7777"
              type="url"
              value={endpoint}
            />
          </div>

          {/* Auth Token */}
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token (optional)</Label>
            <Input
              id="authToken"
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Enter auth token"
              type="password"
              value={authToken}
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <Select
              onValueChange={(v) => setMode(v as "agent" | "team")}
              value={mode}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity Selection */}
          <div className="space-y-2">
            <Label htmlFor="entity">{entityLabel}</Label>
            <Select
              disabled={entities.length === 0}
              onValueChange={setSelectedEntityId}
              value={selectedEntityId}
            >
              <SelectTrigger id="entity">
                <SelectValue
                  placeholder={`Select ${entityLabel.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name || entity.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {entities.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Initialize to load available{" "}
                {mode === "agent" ? "agents" : "teams"}
              </p>
            )}
          </div>

          {/* Database ID */}
          <div className="space-y-2">
            <Label htmlFor="dbId">Database ID (optional)</Label>
            <Input
              id="dbId"
              onChange={(e) => setDbId(e.target.value)}
              placeholder="Enter database ID"
              value={dbId}
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={isInitializing}
              onClick={handleInitialize}
            >
              {isInitializing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Initialize
            </Button>
            <Button
              className="flex-1"
              onClick={handleApplyConfig}
              variant="secondary"
            >
              Apply Config
            </Button>
          </div>

          {error && (
            <div className="rounded bg-destructive/10 p-2 text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Entities */}
      {entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Available {mode === "agent" ? "Agents" : "Teams"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entities.map((entity) => (
                <div
                  className="space-y-1 rounded border p-2 text-sm transition-colors hover:bg-accent/50"
                  key={entity.id}
                >
                  <div className="font-medium">{entity.name || entity.id}</div>
                  {entity.description && (
                    <div className="text-muted-foreground text-xs">
                      {entity.description}
                    </div>
                  )}
                  {entity.model && (
                    <div className="text-xs">
                      <Badge className="text-xs" variant="outline">
                        {typeof entity.model === "string"
                          ? entity.model
                          : entity.model.name}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
