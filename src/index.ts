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
      moons: [],
      travelRisk: "Low",
      travelTimeDays: 88,
      travelNotes: "Mercury has no moons and is the closest planet to the Sun, making it a quick trip."
    },
    {
      name: "Venus",
      type: "Terrestrial",
      diameter_km: 12104,
      distanceFromSun_km: 108200000,
      moons: [],
      travelRisk: "Low",
      travelTimeDays: 225,
      travelNotes: "Venus has no moons and is similar in structure to Earth, but with a thick, toxic atmosphere."
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
      ],
      travelRisk: "N/A",
      travelTimeDays: 0,
      travelNotes: "Earth is the only planet known to support life and has one natural satellite"
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
      ],
      travelRisk: "Moderate",
      travelTimeDays: 687,
      travelNotes: "Mars has two small moons and is known for its red color due to"
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
      ],
      travelRisk: "High",
      travelTimeDays: 4333,
      travelNotes: "Jupiter is the largest planet in the solar system and has a strong"
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
      ],
      travelRisk: "High",
      travelTimeDays: 10759,
      travelNotes: "Saturn is known for its stunning rings and has many moons, including Titan, which is larger than the planet Mercury."
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
      ],
      travelRisk: "High",
      travelTimeDays: 30687,
      travelNotes: "Uranus is unique for its tilted axis and has a cold, windy atmosphere. It has a number of moons, including Titania and Oberon."
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
      ],
      travelRisk: "High",
      travelTimeDays: 60190,
      travelNotes: "Neptune is the farthest planet from the Sun and has a dynamic atmosphere with strong winds. It has one large moon, Triton, which is geologically active."
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
  console.log('Received POST MCP request');
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
    console.log('MCP request handled successfully');
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
