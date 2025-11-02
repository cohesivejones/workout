import { setupServer } from 'msw/node';

// Create MSW server instance with no default handlers
// Tests will add their own handlers using server.use()
export const server = setupServer();
