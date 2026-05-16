import { connectToMongo } from './db.js';
import { createServer } from './server.js';
import { config } from './config.js';

await connectToMongo();

const app = createServer();

app.listen(config.port, () => {
  console.log(`Stravatronics API running on http://localhost:${config.port}`);
});
