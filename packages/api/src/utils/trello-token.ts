import { decryptToken, encryptToken } from "./encryption";

const encryptedTrelloTokenPrefix = "kan:trello:v1:";

export const encryptTrelloToken = (token: string) =>
  `${encryptedTrelloTokenPrefix}${encryptToken(token)}`;

export const decryptTrelloToken = (storedToken: string) =>
  storedToken.startsWith(encryptedTrelloTokenPrefix)
    ? decryptToken(storedToken.slice(encryptedTrelloTokenPrefix.length))
    : storedToken;
