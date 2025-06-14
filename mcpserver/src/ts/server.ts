// mcpserver/src/server.ts

import express, { Request, Response } from 'express';
import apiRoutes from './routes/api';

// Create the Express application
const app = express();

// Define the port. Use a PORT from environment variables if available, otherwise default to 3000.
const PORT = process.env.PORT || 3000;

// --- Middleware ---

// A simple middleware to log all incoming requests
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
});

// This middleware is used to parse incoming JSON bodies.
app.use(express.json());

// --- Routes ---

// A simple health-check endpoint to see if the server is running.
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('MCP Server is online and ready.');
});

// Register the API routes under the /api prefix.
// All routes defined in `src/routes/api.ts` will be available under `/api/...`
app.use('/api', apiRoutes);

// --- Server Activation ---

// Start listening for requests on the specified port.
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`  MCP Server started successfully!`);
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`-------------------------------------------`);
    console.log(`Available endpoints for your LLM:`);
    console.log(`  - GET http://localhost:${PORT}/api/character-sheet`);
    console.log(`  - GET http://localhost:${PORT}/api/voice-context`);
    console.log(`  - GET http://localhost:${PORT}/api/ruleset`);
    console.log(`-------------------------------------------`);
});
