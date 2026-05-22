import { createAuthClient } from "better-auth/react";
// baseURL omitted — better-auth uses the current origin automatically (same domain)
export const authClient = createAuthClient();
