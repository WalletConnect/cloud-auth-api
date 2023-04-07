import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import Session from "express-session";
import { SiweMessage, generateNonce } from "siwe";

import { verifyAndSignIn } from "./handlers/verify";
dotenv.config();

declare module "express-session" {
  interface SessionData {
    nonce?: string;
    siwe?: SiweMessage;
  }
}

const { PORT, COOKIE_SECRET, COOKIE_NAME, CLOUD_APP_ORIGIN } = process.env;
if (!COOKIE_SECRET) {
  throw new ReferenceError("COOKIE_SECRET missing in environment variables");
}
if (!CLOUD_APP_ORIGIN) {
  throw new ReferenceError("CLOUD_APP_ORIGIN missing in environment variables");
}

const app = express();

// Disable header "x-powered-by: express"
app.disable("x-powered-by");

app.use(express.json());
app.use(
  cors({
    origin: CLOUD_APP_ORIGIN,
    credentials: true,
    methods: ["OPTIONS", "GET", "POST"],
  })
);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit each IP to 30 requests per `window` (here, per 10 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.use(
  Session({
    name: COOKIE_NAME,
    secret: COOKIE_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV !== "dev",
      sameSite: true,
      httpOnly: true,
    },
  })
);

app.get("/nonce", async function (req, res) {
  req.session.nonce = generateNonce();
  return res.status(200).json({ nonce: req.session.nonce });
});

app.post("/connect", verifyAndSignIn);

// custom 404
app.use((req, res, next) => {
  return res.status(404).json({ error: "Sorry can't find that!" });
});

// custom error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  return res.status(500).json({ error: "Something went wrong!" });
});

const server = app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});

// Create a function to close the server and exit the process
const exitProcess = () => {
  console.log("Closing server and exiting process...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(1);
  });
};

// Gracefully handle SIGINT (Ctrl+C) and SIGTERM (docker stop)
process.on("SIGINT", exitProcess);
process.on("SIGTERM", exitProcess);

// Gracefully handle uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  exitProcess();
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  exitProcess();
});
