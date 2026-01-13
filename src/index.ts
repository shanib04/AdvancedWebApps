import express from "express";
import connectDB from "./config/db";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";

const app = express();

connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

export default app;
