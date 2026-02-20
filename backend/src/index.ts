import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

const app = express();

connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.use("/upload", uploadRoutes);
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

// Swagger documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Advanced Web Apps API Documentation",
  }),
);

// Swagger JSON endpoint
app.get("/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

export default app;
