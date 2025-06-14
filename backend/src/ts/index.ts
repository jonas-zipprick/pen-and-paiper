import express from 'express';
import http from 'http';

import {bindWss} from './wss';
import {config} from './config';

const app = express();


const server = http.createServer(app);

bindWss(server);

server.listen(config.port, () => {
    console.log(`🚀 Backend server is running and listening on http://localhost:${config.port}`);
});

