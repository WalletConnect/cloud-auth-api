import { randomBytes } from "crypto";

export const SEVEN_DAYS_IN_SECONDS = 604800;
export const DEFAULT_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

export const secureToken = (...options: number[]): string => {
  let length = 16;
  if (options.length > 0) {
    length = options[0];
  }
  const buffer = randomBytes(length);
  let token = buffer.toString("base64");
  token = token.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return token;
};
