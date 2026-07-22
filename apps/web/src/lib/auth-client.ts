"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Talks to /api/auth/* — it never sees session or OAuth
 * tokens (those stay in HttpOnly cookies and server-only code).
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
