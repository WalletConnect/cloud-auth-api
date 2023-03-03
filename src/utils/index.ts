import { PrismaClient, users } from "@prisma/client";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";

interface GoTrueClaims {
  sub: string;
  aud: string;
  exp: number;
  email?: string;
  phone?: string;
  app_metadata: any;
  user_metadata: any;
  role: string;
  session_id: string;
  authenticator_assurance_level?: string;
  authentication_method_reference?: any[];
}

export const SEVEN_DAYS_IN_SECONDS = 604800;

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

export const generateAccessToken = async (
  user: users,
  expiresIn: number,
  sessionId?: string
): Promise<string> => {
  let aal = "AAL1";
  let amr: any[] = [];
  const prisma = new PrismaClient();

  if (sessionId) {
    const session = await prisma.sessions.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (session?.aal) {
      aal = session?.aal;
    }

    if (!session) {
      throw new Error("Session not found");
    }
  }

  if (!user.aud || !user.role || !sessionId) {
    throw new Error("Missing user informations");
  }

  const claims: GoTrueClaims = {
    sub: user.id,
    aud: user.aud,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    app_metadata: user.raw_app_meta_data,
    user_metadata: user.raw_user_meta_data,
    role: user.role,
    session_id: sessionId,
    email: "",
    phone: "",
    // authenticator_assurance_level: aal,
    // authentication_method_reference: amr,
  };

  console.log({ claims });

  if (!process.env.SB_JWT_SECRET) {
    throw new Error("Missing secret");
  }

  const token = jwt.sign(claims, process.env.SB_JWT_SECRET);
  return token;
};
