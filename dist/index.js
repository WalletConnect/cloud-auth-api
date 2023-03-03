"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const siwe_1 = require("siwe");
const verify_1 = require("./handlers/verify");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use((0, express_session_1.default)({
    name: "siwe-quickstart",
    secret: "siwe-quickstart-secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: true, httpOnly: true },
}));
app.get("/nonce", function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        req.session.nonce = (0, siwe_1.generateNonce)();
        res.setHeader("Content-Type", "text/plain");
        res.status(200).send(req.session.nonce);
    });
});
app.post("/connect", verify_1.verifyAndSignIn);
app.get("/personal_information", function (req, res) {
    if (!req.session.siwe) {
        res.status(401).json({ message: "You have to first sign_in" });
        return;
    }
    console.log("User is authenticated!");
    res.setHeader("Content-Type", "text/plain");
    res.send(`You are authenticated and your address is: ${req.session.siwe.address}`);
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
