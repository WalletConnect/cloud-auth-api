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
exports.verifyAndSignIn = void 0;
const client_1 = require("@prisma/client");
const cookie_1 = __importDefault(require("cookie"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const siwe_1 = require("siwe");
const utils_1 = require("../utils");
const verifyAndSignIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        let message = new siwe_1.SiweMessage(req.body.message);
        console.log({ address: message.address });
        const fields = yield message.validate(req.body.signature);
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
        const prisma = new client_1.PrismaClient();
        const newUser = yield prisma.users.create({
            data: {
                aud: "authenticated",
                role: "authenticated",
                email: fields.address,
                instance_id: "00000000-0000-0000-0000-000000000000",
                last_sign_in_at: fields.issuedAt,
                raw_app_meta_data: { provider: "eth", providers: ["eth"] },
                raw_user_meta_data: Object.assign({}, fields),
            },
        });
        console.log({ newUser });
        const session = yield prisma.sessions.create({
            data: {
                user_id: newUser.id,
            },
        });
        console.log({ session });
        const identity = yield prisma.identities.create({
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
        const generatedRefreshToken = (0, utils_1.secureToken)();
        const refreshToken = yield prisma.refresh_tokens.create({
            data: {
                session_id: session.id,
                user_id: newUser.id,
                instance_id: "00000000-0000-0000-0000-000000000000",
                parent: "",
                token: generatedRefreshToken,
            },
        });
        console.log({ refreshToken });
        const supabaseJWT = jsonwebtoken_1.default.sign(Object.assign(Object.assign({}, fields), { userId: newUser.id, refreshToken: refreshToken.token }), sbJWTSecret, {
            expiresIn: utils_1.SEVEN_DAYS_IN_SECONDS,
        });
        const accessToken = yield (0, utils_1.generateAccessToken)(newUser, utils_1.SEVEN_DAYS_IN_SECONDS, session.id);
        console.log({ accessToken });
        req.session.save(() => {
            res.setHeader("Set-Cookie", cookie_1.default.serialize(sbJWTCookieName, supabaseJWT, {
                path: "/",
                secure: process.env.NODE_ENV !== "development",
                // allow the cookie to be accessed client-side
                httpOnly: false,
                sameSite: true,
                maxAge: utils_1.SEVEN_DAYS_IN_SECONDS,
            }));
            res.status(200).json({
                accessToken: accessToken,
                refreshToken: refreshToken.token,
            });
        });
    }
    catch (e) {
        req.session.siwe = undefined;
        req.session.nonce = undefined;
        console.error(e);
        switch (e) {
            case siwe_1.ErrorTypes.EXPIRED_MESSAGE: {
                req.session.save(() => res.status(440).json({ message: e.message }));
                break;
            }
            case siwe_1.ErrorTypes.INVALID_SIGNATURE: {
                req.session.save(() => res.status(422).json({ message: e.message }));
                break;
            }
            default: {
                req.session.save(() => res.status(500).json({ message: e.message }));
                break;
            }
        }
    }
});
exports.verifyAndSignIn = verifyAndSignIn;
