"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
(0, db_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/public", express_1.default.static(path_1.default.join(__dirname, "../public")));
// Routes
app.use("/upload", uploadRoutes_1.default);
app.use("/auth", authRoutes_1.default);
app.use("/user", userRoutes_1.default);
app.use("/post", postRoutes_1.default);
app.use("/comment", commentRoutes_1.default);
// Swagger documentation
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Advanced Web Apps API Documentation",
}));
// Swagger JSON endpoint
app.get("/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swagger_1.specs);
});
exports.default = app;
