import { NextFunction, Request, Response } from "express";

export const captchaVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === "development") {
    return next();
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
