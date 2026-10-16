// Compatibility entry point for the original prototype.
import { createServer } from './server.mjs';
import { configuration } from './lib/model.mjs';
const { port, host } = configuration();
createServer().listen(port, host, () => console.log(`Margin is running at http://${host}:${port}`));
