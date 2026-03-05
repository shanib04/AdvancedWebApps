// Itay-Ram-214294373-Shani-Bashari-325953743

import "dotenv/config";
import https from "https";
import http from "http";
import fs from "fs";
import app from "./index";

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} else {
  const options = {
    key: fs.readFileSync("../client-key.pem"),
    cert: fs.readFileSync("../client-cert.pem"),
  };
  https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`Server running on https://localhost:${HTTPS_PORT}`);
  });
}

export default app;
