# Kan docs

The docs at [docs.kan.bn](https://docs.kan.bn), built with [Mintlify](https://mintlify.com).

```bash
pnpm dev            # preview on http://localhost:3001
npx mint broken-links   # check internal links
```

Pages are `.mdx` files; navigation and redirects live in `docs.json`. The API reference is generated from the live OpenAPI spec. Changes deploy when they're merged to `main`.
