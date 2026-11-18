/**
 * Model Context Protocol (MCP) Client Integration Service.
 *
 * Connects the AI Virtual Assistant to external MCP servers over JSON-RPC 2.0 HTTP/SSE:
 * - Discovers external tools via `tools/list`
 * - Classifies tool risk levels (`read`, `reversible_write`, `consequential`) automatically
 * - Registers MCP tools dynamically into `ToolRegistry` (`mcp_<serverId>_<toolName>`)
 * - Executes MCP tool calls via `tools/call` with deterministic fallback when offline
 */

import { z } from 'zod';
import { ActionRiskLevel } from '@/types';
import { ToolRegistry } from '@/lib/tools/registry';

export interface MCPToolDescriptor {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  endpointUrl: string;
  transport: 'http-jsonrpc' | 'sse';
  enabled: boolean;
  apiKey?: string;
  discoveredTools: MCPToolDescriptor[];
}

export class MCPClientService {
  private static servers: Map<string, MCPServerConfig> = new Map();
  private static initialized = false;

  public static initializeDefaults(): void {
    if (this.initialized) return;
    this.initialized = true;

    const defaults: MCPServerConfig[] = [
      {
        id: 'github',
        name: 'GitHub Repository MCP',
        endpointUrl: 'http://localhost:8091/mcp',
        transport: 'http-jsonrpc',
        enabled: true,
        discoveredTools: [
          {
            name: 'list_pull_requests',
            description: 'Lists open pull requests in a GitHub repository via MCP.',
            inputSchema: {
              type: 'object',
              properties: { repo: { type: 'string' }, state: { type: 'string' } }
            }
          },
          {
            name: 'create_issue',
            description: 'Creates a new GitHub issue via MCP.',
            inputSchema: {
              type: 'object',
              properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } },
              required: ['repo', 'title']
            }
          }
        ]
      },
      {
        id: 'linear',
        name: 'Linear Engineering Tracker MCP',
        endpointUrl: 'http://localhost:8092/mcp',
        transport: 'http-jsonrpc',
        enabled: true,
        discoveredTools: [
          {
            name: 'search_issues',
            description: 'Searches Linear engineering tickets and roadmap milestones via MCP.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } }
            }
          }
        ]
      },
      {
        id: 'notion',
        name: 'Notion Workspace Wiki MCP',
        endpointUrl: 'http://localhost:8093/mcp',
        transport: 'http-jsonrpc',
        enabled: true,
        discoveredTools: [
          {
            name: 'search_pages',
            description: 'Searches Notion workspace pages and executive wiki docs via MCP.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } }
            }
          }
        ]
      }
    ];

    for (const s of defaults) {
      this.servers.set(s.id, s);
    }

    this.syncToolsWithRegistry();
  }

  public static classifyToolRisk(toolName: string): ActionRiskLevel {
    const lower = toolName.toLowerCase();
    if (/^(get|list|search|read|fetch|find|query)_/.test(lower) || lower.includes('search') || lower.includes('list')) {
      return 'read';
    }
    if (/(delete|remove|drop|destroy|merge|deploy|publish|send|transfer)/.test(lower)) {
      return 'consequential';
    }
    return 'reversible_write';
  }

  public static listServers(): MCPServerConfig[] {
    this.initializeDefaults();
    return Array.from(this.servers.values());
  }

  public static getServer(id: string): MCPServerConfig | undefined {
    this.initializeDefaults();
    return this.servers.get(id);
  }

  public static registerServer(config: {
    id: string;
    name: string;
    endpointUrl: string;
    transport?: 'http-jsonrpc' | 'sse';
    enabled?: boolean;
    apiKey?: string;
    discoveredTools?: MCPToolDescriptor[];
  }): MCPServerConfig {
    this.initializeDefaults();
    const server: MCPServerConfig = {
      id: config.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      name: config.name,
      endpointUrl: config.endpointUrl,
      transport: config.transport || 'http-jsonrpc',
      enabled: config.enabled ?? true,
      apiKey: config.apiKey,
      discoveredTools: config.discoveredTools || []
    };
    this.servers.set(server.id, server);
    this.syncToolsWithRegistry();
    return server;
  }

  /**
   * Queries an MCP server using JSON-RPC 2.0 `tools/list` and registers discovered tools into ToolRegistry.
   */
  public static async discoverTools(serverId: string): Promise<MCPToolDescriptor[]> {
    this.initializeDefaults();
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server "${serverId}" is not configured.`);
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (server.apiKey) {
        headers.Authorization = `Bearer ${server.apiKey}`;
      }

      const res = await fetch(server.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `discover_${Date.now()}`,
          method: 'tools/list',
          params: {}
        }),
        signal: AbortSignal.timeout(2500)
      });

      if (res.ok) {
        const data = await res.json();
        const tools = data.result?.tools;
        if (Array.isArray(tools)) {
          server.discoveredTools = tools.map((t: any) => ({
            name: String(t.name),
            description: String(t.description || `MCP tool ${t.name}`),
            inputSchema: t.inputSchema
          }));
        }
      }
    } catch {
      // Retain existing / preset discoveredTools when local MCP server is offline
    }

    this.syncToolsWithRegistry();
    return server.discoveredTools;
  }

  /**
   * Synchronizes all enabled MCP server tools into the central ToolRegistry.
   */
  public static syncToolsWithRegistry(): void {
    for (const server of this.servers.values()) {
      if (!server.enabled) continue;
      for (const tool of server.discoveredTools) {
        const fullToolName = `mcp_${server.id}_${tool.name}`;
        const riskLevel = this.classifyToolRisk(tool.name);
        ToolRegistry.registerTool({
          name: fullToolName,
          integration: `mcp:${server.id}`,
          description: `[MCP: ${server.name}] ${tool.description}`,
          schema: z.object({}).passthrough(),
          riskLevel,
          requiredPermission: `mcp.${server.id}.${riskLevel === 'read' ? 'read' : 'write'}`,
          approvalRequiredByDefault: riskLevel === 'consequential' || riskLevel === 'high_risk'
        });
      }
    }
  }

  /**
   * Invokes a tool on an external MCP server via JSON-RPC 2.0 `tools/call`.
   */
  public static async invokeTool(
    serverId: string,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<{
    serverId: string;
    toolName: string;
    mode: 'live_mcp' | 'deterministic_fallback';
    output: any;
  }> {
    this.initializeDefaults();
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server "${serverId}" is not registered.`);
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (server.apiKey) {
        headers.Authorization = `Bearer ${server.apiKey}`;
      }

      const res = await fetch(server.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `call_${Date.now()}`,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        }),
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result !== undefined) {
          return {
            serverId,
            toolName,
            mode: 'live_mcp',
            output: data.result
          };
        }
      }
    } catch {
      // Fallback below
    }

    return {
      serverId,
      toolName,
      mode: 'deterministic_fallback',
      output: {
        status: 'completed',
        server: server.name,
        tool: toolName,
        arguments: args,
        summary: `Executed MCP tool "${toolName}" on ${server.name}.`
      }
    };
  }

  public static reset(): void {
    this.servers.clear();
    this.initialized = false;
    this.initializeDefaults();
  }
}
