import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import Session from "express-session";
import { generateNonce, SiweMessage } from "siwe";
import { verifyAndSignIn } from "./handlers/verify";
dotenv.config();

declare module "express-session" {
  interface SessionData {
    nonce?: string;
    siwe?: SiweMessage;
    jwt?: string;
  }
}

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  Session({
    name: "siwe-quickstart",
    secret: "siwe-quickstart-secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: true, httpOnly: true },
  })
);

app.get("/nonce", async function (req, res) {
  req.session.nonce = generateNonce();
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(req.session.nonce);
});

app.post("/connect", verifyAndSignIn);

app.get("/personal_information", function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign_in" });
    return;
  }
  console.log("User is authenticated!");
  res.setHeader("Content-Type", "text/plain");
  res.send(
    `You are authenticated and your address is: ${req.session.siwe.address}`
  );
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
