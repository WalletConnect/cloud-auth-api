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
    throw new Error("Missing captcha secret environment varialbe");
  }

  const captchaToken = req.headers["captcha-token"];
  if (!captchaToken) {
    return res
      .status(400)
      .json({ error: "Bad request - missing 'captcha-token' header" });
  }

  try {
    const hCaptchaResponse = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      body: JSON.stringify({
        response: req.headers["captcha-token"],
        secret: process.env.HCAPTCHA_SECRET,
      }),
    });

    const { success } = await hCaptchaResponse.json();

    if (!success) {
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
