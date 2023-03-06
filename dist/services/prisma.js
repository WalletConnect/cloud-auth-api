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
exports.createOrUpdateUser = exports.generateAccessToken = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("../utils");
const generateAccessToken = (user, expiresIn, tx, sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    if (sessionId) {
        const session = yield tx.sessions.findUnique({
            where: {
                id: sessionId,
            },
        });
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
    };
    if (!process.env.SUPABASE_JWT_SECRET) {
        throw new Error("Missing secret");
    }
    const token = jsonwebtoken_1.default.sign(claims, process.env.SUPABASE_JWT_SECRET);
    return token;
});
exports.generateAccessToken = generateAccessToken;
function createOrUpdateUser(siweMsg) {
    return __awaiter(this, void 0, void 0, function* () {
        const prisma = new client_1.PrismaClient();
        const tokens = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield tx.users.findFirst({
                where: {
                    raw_user_meta_data: {
                        path: ["address"],
                        equals: siweMsg.address,
                    },
                },
            });
            if (existingUser) {
                // Check for an existing session and update the last sign in date
                let [existingSession] = yield Promise.all([
                    tx.sessions.findFirst({
                        where: {
                            user_id: existingUser.id,
                        },
                    }),
                    tx.users.update({
                        where: {
                            id: existingUser.id,
                        },
                        data: {
                            last_sign_in_at: siweMsg.issuedAt,
                        },
                    }),
                ]);
                if (!existingSession) {
                    existingSession = yield tx.sessions.create({
                        data: {
                            user_id: existingUser.id,
                        },
                    });
                }
                let existingIdentity = yield tx.identities.findFirst({
                    where: {
                        user_id: existingUser.id,
                    },
                });
                if (!existingIdentity) {
                    existingIdentity = yield tx.identities.create({
                        data: {
                            id: existingUser.id,
                            provider: "eth",
                            user_id: existingUser.id,
                            identity_data: {
                                sub: existingUser.id,
                                address: siweMsg.address,
                            },
                            last_sign_in_at: siweMsg.issuedAt,
                        },
                    });
                }
                // Generate access and refresh tokens
                const generatedRefreshToken = (0, utils_1.secureToken)();
                const [refreshToken, accessToken] = yield Promise.all([
                    tx.refresh_tokens.create({
                        data: {
                            session_id: existingSession.id,
                            user_id: existingUser.id,
                            instance_id: utils_1.DEFAULT_INSTANCE_ID,
                            parent: "",
                            token: generatedRefreshToken,
                        },
                    }),
                    (0, exports.generateAccessToken)(existingUser, utils_1.SEVEN_DAYS_IN_SECONDS, tx, existingSession.id),
                ]);
                return { refreshToken: refreshToken.token, accessToken };
            }
            const newUser = yield tx.users.create({
                data: {
                    aud: "authenticated",
                    role: "authenticated",
                    email_confirmed_at: new Date().toISOString(),
                    instance_id: utils_1.DEFAULT_INSTANCE_ID,
                    last_sign_in_at: siweMsg.issuedAt,
                    raw_app_meta_data: { provider: "eth", providers: ["eth"] },
                    raw_user_meta_data: Object.assign({}, siweMsg),
                },
            });
            // Create the session and identity at the same time
            const [session] = yield Promise.all([
                tx.sessions.create({
                    data: {
                        user_id: newUser.id,
                    },
                }),
                tx.identities.create({
                    data: {
                        id: newUser.id,
                        provider: "eth",
                        user_id: newUser.id,
                        identity_data: {
                            sub: newUser.id,
                            address: siweMsg.address,
                        },
                        last_sign_in_at: siweMsg.issuedAt,
                    },
                }),
            ]);
            // Generate tokens
            const generatedRefreshToken = (0, utils_1.secureToken)();
            const [refreshToken, accessToken] = yield Promise.all([
                tx.refresh_tokens.create({
                    data: {
                        session_id: session.id,
                        user_id: newUser.id,
                        instance_id: utils_1.DEFAULT_INSTANCE_ID,
                        parent: "",
                        token: generatedRefreshToken,
                    },
                }),
                (0, exports.generateAccessToken)(newUser, utils_1.SEVEN_DAYS_IN_SECONDS, tx, session.id),
            ]);
            return { refreshToken: refreshToken.token, accessToken };
        }));
        return tokens;
    });
}
exports.createOrUpdateUser = createOrUpdateUser;
