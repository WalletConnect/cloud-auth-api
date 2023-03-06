"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureToken = exports.DEFAULT_INSTANCE_ID = exports.SEVEN_DAYS_IN_SECONDS = void 0;
const crypto_1 = require("crypto");
exports.SEVEN_DAYS_IN_SECONDS = 604800;
exports.DEFAULT_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";
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
