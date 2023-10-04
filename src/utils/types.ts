import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export interface GoTrueClaims {
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

export type TPrismaTransaction = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
