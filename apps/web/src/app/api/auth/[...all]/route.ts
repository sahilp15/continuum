import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth mounts all its endpoints (sign-in, sign-up, callbacks, sign-out,
// session) under /api/auth/*.
export const { GET, POST } = toNextJsHandler(auth);
