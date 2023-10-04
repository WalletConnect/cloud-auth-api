import { ethers } from "ethers";
import { Request, Response } from "express";
import { SiweErrorType, SiweMessage } from "siwe";
import { createOrUpdateUser } from "../services/prisma";

const provider = new ethers.InfuraProvider(
  "mainnet",
  process.env.INFURA_API_KEY
);

export const verifyAndSignIn = async (req: Request, res: Response) => {
  try {
    if (!req.body.message) {
      res
        .status(422)
        .json({ message: "Expected prepareMessage object as body." });
      return;
    }

    const message = new SiweMessage(req.body.message);
    const fields = await message.validate(req.body.signature, provider);
    if (fields.nonce !== req.session.nonce) {
      res.status(422).json({
        message: `Invalid nonce.`,
      });
      return;
    }
    req.session.siwe = fields;
    if (!fields.expirationTime) {
      return res.status(422).json({
        message: `Expected expirationTime to be set.`,
      });
    }
    req.session.cookie.expires = new Date(fields.expirationTime);

    const { accessToken, refreshToken } = await createOrUpdateUser(fields);

    return req.session.save(() => {
      return res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    });
  } catch (e: any) {
    console.error(e);
    req.session.siwe = undefined;
    req.session.nonce = undefined;
    try {
      switch (e) {
        case SiweErrorType.EXPIRED_MESSAGE: {
          req.session.save(() => res.status(440).json({ message: e.message }));
          break;
        }
        case SiweErrorType.INVALID_SIGNATURE: {
          req.session.save(() => res.status(422).json({ message: e.message }));
          break;
        }
        default: {
          req.session.save(() => res.status(500).json({ message: e.message }));
          break;
        }
      }
    } catch (sessionError) {
      console.error(`Failed to save session, ${JSON.stringify(sessionError)}`);
    }

    return;
  }
};
