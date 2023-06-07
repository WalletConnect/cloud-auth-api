import { NextFunction, Request, Response } from "express";

export const captchaVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  const captchaSecret = process.env.HCAPTCHA_SECRET;
  if (!captchaSecret) {
    throw new Error("Missing captcha secret environment variable");
  }

  const captchaToken = req.headers["captcha-token"];
  if (!captchaToken) {
    return res
      .status(400)
      .json({ error: "Bad request - missing 'captcha-token' header" });
  }

  try {
    const hCaptchaRawResponse = await fetch(
      `https://hcaptcha.com/siteverify?secret=${captchaSecret}&response=${captchaToken}`,
      {
        method: "POST",
      }
    );
    const hCaptchaResponse = (await hCaptchaRawResponse.json()) as {
      success: boolean;
      challenge_ts: string;
      hostname: string;
    };

    if (!hCaptchaResponse?.success) {
      return res.status(403).json({ error: "hCaptcha verification failed" });
    }
    next();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Error occurred during hCaptcha verification" });
  }
};
