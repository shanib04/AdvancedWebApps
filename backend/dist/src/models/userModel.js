"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    username: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    photoUrl: {
        type: String,
    },
    refresh_tokens: {
        type: [String],
        default: [],
    },
    refreshToken: {
        type: [String],
        default: [],
    },
});
userSchema.pre("save", async function () {
    const doc = this;
    if (doc.refresh_tokens && doc.refresh_tokens.length > 0) {
        doc.refreshToken = doc.refresh_tokens;
    }
    else if (doc.refreshToken && doc.refreshToken.length > 0) {
        doc.refresh_tokens = doc.refreshToken;
    }
    else {
        doc.refresh_tokens = [];
        doc.refreshToken = [];
    }
});
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
