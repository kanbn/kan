import { decryptToken, encryptToken } from "./encryption";

const encryptedTrelloTokenPrefix = "kan:trello:v1:";

export const isEncryptedTrelloToken = (token: string) =>
  token.startsWith(encryptedTrelloTokenPrefix);

export const encryptTrelloToken = (token: string) =>
  `${encryptedTrelloTokenPrefix}${encryptToken(token)}`;

export const decryptTrelloToken = (storedToken: string) =>
  isEncryptedTrelloToken(storedToken)
    ? decryptToken(storedToken.slice(encryptedTrelloTokenPrefix.length))
    : storedToken;
