"use strict";
// Itay-Ram-214294373-Shani-Bashari-325953743
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const index_1 = __importDefault(require("./index"));
const PORT = process.env.PORT || 3000;
index_1.default.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = index_1.default;
