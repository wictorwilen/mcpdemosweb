import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import debug from "debug";
import { z } from 'zod';

const log = debug("");
log("MCP server starting...");


const mcpServer = new McpServer({
  name: "planets-mcp",
  version: "1.0.0",
  description: "A planet lookup server",
}, {
  capabilities: {
    logging: {},
    tools: {
      listChanged: true
    }
  }
});


mcpServer.registerTool("getPlanets", {
  description: "Retrieve a list of planets in the solar system",
  inputSchema: {
    includeMoons: z.boolean().optional().default(false)
  }
}, async ({ includeMoons }) => {

  const planets = [
    {
      name: "Mercury",
      type: "Terrestrial",
      diameter_km: 4879,
      distanceFromSun_km: 57900000,
      moons: []
    },
    {
      name: "Venus",
      type: "Terrestrial",
      diameter_km: 12104,
      distanceFromSun_km: 108200000,
      moons: []
    },
    {
      name: "Earth",
      type: "Terrestrial",
      diameter_km: 12742,
      distanceFromSun_km: 149600000,
      moons: [
        {
          name: "Moon",
          diameter_km: 3474,
          discovered: "Prehistoric"
        }
      ]
    },
    {
      name: "Mars",
      type: "Terrestrial",
      diameter_km: 6779,
      distanceFromSun_km: 227900000,
      moons: [
        {
          name: "Phobos",
          diameter_km: 22.2,
          discovered: 1877
        },
        {
          name: "Deimos",
          diameter_km: 12.4,
          discovered: 1877
        }
      ]
    },
    {
      name: "Jupiter",
      type: "Gas Giant",
      diameter_km: 139820,
      distanceFromSun_km: 778500000,
      moons: [
        {
          name: "Io",
          diameter_km: 3643,
          discovered: 1610
        },
        {
          name: "Europa",
          diameter_km: 3122,
          discovered: 1610
        },
        {
          name: "Ganymede",
          diameter_km: 5268,
          discovered: 1610
        },
        {
          name: "Callisto",
          diameter_km: 4820,
          discovered: 1610
        }
      ]
    },
    {
      name: "Saturn",
      type: "Gas Giant",
      diameter_km: 116460,
      distanceFromSun_km: 1434000000,
      moons: [
        {
          name: "Titan",
          diameter_km: 5150,
          discovered: 1655
        },
        {
          name: "Rhea",
          diameter_km: 1528,
          discovered: 1672
        },
        {
          name: "Iapetus",
          diameter_km: 1469,
          discovered: 1671
        }
      ]
    },
    {
      name: "Uranus",
      type: "Ice Giant",
      diameter_km: 50724,
      distanceFromSun_km: 2871000000,
      moons: [
        {
          name: "Titania",
          diameter_km: 1578,
          discovered: 1787
        },
        {
          name: "Oberon",
          diameter_km: 1523,
          discovered: 1787
        }
      ]
    },
    {
      name: "Neptune",
      type: "Ice Giant",
      diameter_km: 49244,
      distanceFromSun_km: 4495000000,
      moons: [
        {
          name: "Triton",
          diameter_km: 2706,
          discovered: 1846
        }
      ]
    }
  ];

  var returnedPlanets: string
  if (includeMoons === true) {
    returnedPlanets = JSON.stringify(planets);
  } else {
    returnedPlanets = JSON.stringify(planets.map(({ moons, ...rest }) => rest));
  }

  return {
    content: [{
      type: "text",
      text: returnedPlanets
    }]
  }
});


const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.

  try {
    const server = mcpServer;
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
