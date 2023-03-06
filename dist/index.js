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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_session_1 = __importDefault(require("express-session"));
const siwe_1 = require("siwe");
const verify_1 = require("./handlers/verify");
dotenv_1.default.config();
const { PORT, COOKIE_SECRET, COOKIE_NAME, CLOUD_APP_URL } = process.env;
if (!COOKIE_SECRET) {
    throw new ReferenceError("COOKIE_SECRET missing in environment variables");
}
if (!CLOUD_APP_URL) {
    throw new ReferenceError("CLOUD_APP_URL missing in environment variables");
}
const app = (0, express_1.default)();
// Disable header "x-powered-by: express"
app.disable("x-powered-by");
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: CLOUD_APP_URL,
    credentials: true,
    methods: ["OPTIONS", "GET", "POST"],
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Apply the rate limiting middleware to all requests
app.use(limiter);
app.use((0, express_session_1.default)({
    name: COOKIE_NAME,
    secret: COOKIE_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV !== "dev",
        sameSite: true,
        httpOnly: true,
    },
}));
app.get("/nonce", function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        req.session.nonce = (0, siwe_1.generateNonce)();
        return res.status(200).json({ nonce: req.session.nonce });
    });
});
app.post("/connect", verify_1.verifyAndSignIn);
// custom 404
app.use((req, res, next) => {
    return res.status(404).json({ error: "Sorry can't find that!" });
});
// custom error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ error: "Something went wrong!" });
});
app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
