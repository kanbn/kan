import { toNodeHandler } from "better-auth/node";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";

export const config = { api: { bodyParser: false } };

export const auth = initAuth(createDrizzleClient());

export default toNodeHandler(auth.handler);
