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
exports.generateAccessToken = exports.secureToken = exports.SEVEN_DAYS_IN_SECONDS = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.SEVEN_DAYS_IN_SECONDS = 604800;
const secureToken = (...options) => {
    let length = 16;
    if (options.length > 0) {
        length = options[0];
    }
    const buffer = (0, crypto_1.randomBytes)(length);
    let token = buffer.toString("base64");
    token = token.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return token;
};
exports.secureToken = secureToken;
const generateAccessToken = (user, expiresIn, sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    let aal = "AAL1";
    let amr = [];
    const prisma = new client_1.PrismaClient();
    if (sessionId) {
        const session = yield prisma.sessions.findUnique({
            where: {
                id: sessionId,
            },
        });
        if (session === null || session === void 0 ? void 0 : session.aal) {
            aal = session === null || session === void 0 ? void 0 : session.aal;
        }
        if (!session) {
            throw new Error("Session not found");
        }
    }
    if (!user.aud || !user.role || !sessionId) {
        throw new Error("Missing user informations");
    }
    const claims = {
        sub: user.id,
        aud: user.aud,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        app_metadata: user.raw_app_meta_data,
        user_metadata: user.raw_user_meta_data,
        role: user.role,
        session_id: sessionId,
        email: "",
        phone: "",
        // authenticator_assurance_level: aal,
        // authentication_method_reference: amr,
    };
    console.log({ claims });
    if (!process.env.SB_JWT_SECRET) {
        throw new Error("Missing secret");
    }
    const token = jsonwebtoken_1.default.sign(claims, process.env.SB_JWT_SECRET);
    return token;
});
exports.generateAccessToken = generateAccessToken;
