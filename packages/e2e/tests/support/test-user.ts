export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export function createTestUser(): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: "E2E Test User",
    email: `e2e-${unique}@kan-test.local`,
    password: "TestPassword123!",
  };
}
