import { SetMetadata } from "@nestjs/common";

export const SKIP_RATE_LIMIT = "skipRateLimit";
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT, true);
