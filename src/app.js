// app.js
const express = require("express");
const postRoutes = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

module.exports = app;
