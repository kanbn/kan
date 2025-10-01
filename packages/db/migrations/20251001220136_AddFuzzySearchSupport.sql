CREATE EXTENSION IF NOT EXISTS pg_trgm; --> statement-breakpoint
CREATE INDEX IF NOT EXISTS boards_name_trgm_idx ON board USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cards_title_trgm_idx ON card USING gin (title gin_trgm_ops);
