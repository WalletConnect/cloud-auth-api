import { PrismaClient } from "@prisma/client";
import cookie from "cookie";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ErrorTypes, SiweMessage } from "siwe";
import {
  generateAccessToken,
  secureToken,
  SEVEN_DAYS_IN_SECONDS,
} from "../utils";

export const verifyAndSignIn = async (req: Request, res: Response) => {
  const sbJWTSecret = process.env.SB_JWT_SECRET;
  const sbJWTCookieName = process.env.SB_JWT_COOKIE_NAME;
  if (!sbJWTSecret) {
    throw new ReferenceError("Missing secret environment variable");
  }
  if (!sbJWTCookieName) {
    throw new ReferenceError("Missing cookie name environment variable");
  }
  try {
    if (!req.body.message) {
      res
        .status(422)
        .json({ message: "Expected prepareMessage object as body." });
      return;
    }

    let message = new SiweMessage(req.body.message);
    console.log({ address: message.address });

    const fields = await message.validate(req.body.signature);
    if (fields.nonce !== req.session.nonce) {
      console.log({ nonce: fields.nonce, sessionNonce: req.session.nonce });
      console.log(req.session);
      res.status(422).json({
        message: `Invalid nonce.`,
      });
      return;
    }
    req.session.siwe = fields;
    if (!fields.expirationTime) {
      res.status(422).json({
        message: `Expected expirationTime to be set.`,
      });
      return;
    }
    req.session.cookie.expires = new Date(fields.expirationTime);

    // TODO: interact with auth.users here
    const prisma = new PrismaClient();
    const newUser = await prisma.users.create({
      data: {
        aud: "authenticated",
        role: "authenticated",
        email: fields.address,
        instance_id: "00000000-0000-0000-0000-000000000000",
        last_sign_in_at: fields.issuedAt,
        raw_app_meta_data: { provider: "eth", providers: ["eth"] },
        raw_user_meta_data: { ...fields },
      },
    });
    console.log({ newUser });

    const session = await prisma.sessions.create({
      data: {
        user_id: newUser.id,
      },
    });
    console.log({ session });

    const identity = await prisma.identities.create({
      data: {
        id: newUser.id,
        provider: "eth",
        user_id: newUser.id,
        identity_data: {
          sub: newUser.id,
          address: fields.address,
        },
        last_sign_in_at: fields.issuedAt,
      },
    });

    console.log({ identity });

    const generatedRefreshToken = secureToken();

    const refreshToken = await prisma.refresh_tokens.create({
      data: {
        session_id: session.id,
        user_id: newUser.id,
        instance_id: "00000000-0000-0000-0000-000000000000",
        parent: "",
        token: generatedRefreshToken,
      },
    });

    console.log({ refreshToken });

    const supabaseJWT = jwt.sign(
      {
        ...fields,
        userId: newUser.id,
        refreshToken: refreshToken.token,
      },
      sbJWTSecret,
      {
        expiresIn: SEVEN_DAYS_IN_SECONDS,
      }
    );

    const accessToken = await generateAccessToken(
      newUser,
      SEVEN_DAYS_IN_SECONDS,
      session.id
    );

    console.log({ accessToken });

    req.session.save(() => {
      res.setHeader(
        "Set-Cookie",
        cookie.serialize(sbJWTCookieName, supabaseJWT, {
          path: "/",
          secure: process.env.NODE_ENV !== "development",
          // allow the cookie to be accessed client-side
          httpOnly: false,
          sameSite: true,
          maxAge: SEVEN_DAYS_IN_SECONDS,
        })
      );
      res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshToken.token,
      });
    });
  } catch (e: any) {
    req.session.siwe = undefined;
    req.session.nonce = undefined;
    console.error(e);
    switch (e) {
      case ErrorTypes.EXPIRED_MESSAGE: {
        req.session.save(() => res.status(440).json({ message: e.message }));
        break;
      }
      case ErrorTypes.INVALID_SIGNATURE: {
        req.session.save(() => res.status(422).json({ message: e.message }));
        break;
      }
      default: {
        req.session.save(() => res.status(500).json({ message: e.message }));
        break;
      }
    }
  }
};
