import { type Config } from "drizzle-kit";

export default {
  schema: "./src/schema",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.POSTGRES_URL ??
      "postgresql://banana:banana@localhost:5432/banana",
    ssl: process.env.NODE_ENV === "production" ? true : false,
  },
  migrations: {
    prefix: "timestamp",
  },
} satisfies Config;
