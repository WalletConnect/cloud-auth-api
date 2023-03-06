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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndSignIn = void 0;
const siwe_1 = require("siwe");
const prisma_1 = require("../services/prisma");
const verifyAndSignIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.message) {
            res
                .status(422)
                .json({ message: "Expected prepareMessage object as body." });
            return;
        }
        const message = new siwe_1.SiweMessage(req.body.message);
        const fields = yield message.validate(req.body.signature);
        if (fields.nonce !== req.session.nonce) {
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
        const { accessToken, refreshToken } = yield (0, prisma_1.createOrUpdateUser)(fields);
        return req.session.save(() => {
            return res.status(200).json({
                accessToken: accessToken,
                refreshToken: refreshToken,
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
