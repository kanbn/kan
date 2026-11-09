import type { Request } from "express";

import type { User } from "./user.interface.js";

export interface AuthenticatedRequest extends Request {
  user: User;
}
