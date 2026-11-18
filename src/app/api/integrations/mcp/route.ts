import { NextRequest, NextResponse } from 'next/server';
import { MCPClientService } from '@/lib/integrations/mcp/client';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
  }

  const servers = MCPClientService.listServers().map(s => ({
    ...s,
    apiKey: SecurityAuth.maskSecret(s.apiKey)
  }));

  return NextResponse.json({ servers });
}

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const action = body.action || 'register';

    if (action === 'discover') {
      if (!body.serverId) {
        return NextResponse.json({ error: 'serverId is required for discover.' }, { status: 400 });
      }
      const tools = await MCPClientService.discoverTools(body.serverId);
      return NextResponse.json({ serverId: body.serverId, tools });
    }

    if (action === 'invoke') {
      if (!body.serverId || !body.toolName) {
        return NextResponse.json({ error: 'serverId and toolName are required.' }, { status: 400 });
      }
      const result = await MCPClientService.invokeTool(body.serverId, body.toolName, body.arguments || {});
      return NextResponse.json({ result });
    }

    if (!body.id || !body.name || !body.endpointUrl) {
      return NextResponse.json({ error: 'id, name, and endpointUrl are required.' }, { status: 400 });
    }

    const server = MCPClientService.registerServer({
      id: body.id,
      name: body.name,
      endpointUrl: body.endpointUrl,
      transport: body.transport || 'http-jsonrpc',
      enabled: body.enabled ?? true,
      apiKey: body.apiKey,
      discoveredTools: body.discoveredTools
    });

    return NextResponse.json({
      server: {
        ...server,
        apiKey: SecurityAuth.maskSecret(server.apiKey)
      },
      servers: MCPClientService.listServers().map(s => ({
        ...s,
        apiKey: SecurityAuth.maskSecret(s.apiKey)
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'MCP operation failed.' }, { status: 400 });
  }
}
