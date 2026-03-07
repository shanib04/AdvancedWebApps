// Itay-Ram-214294373-Shani-Bashari-325953743

import "dotenv/config";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import app from "./index";

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} else {
  const defaultKeyPath = path.join(__dirname, "../../../certs/client-key.pem");
  const defaultCertPath = path.join(__dirname, "../../../certs/client-cert.pem");

  const keyPath = process.env.HTTPS_KEY_PATH || defaultKeyPath;
  const certPath = process.env.HTTPS_CERT_PATH || defaultCertPath;

  // Validate certificate files exist
  if (!fs.existsSync(keyPath)) {
    console.error("HTTPS key not found at:", keyPath);
    console.error(
      "Set HTTPS_KEY_PATH environment variable to the path of your SSL key file",
    );
    process.exit(1);
  }

  if (!fs.existsSync(certPath)) {
    console.error("HTTPS certificate not found at:", certPath);
    console.error(
      "Set HTTPS_CERT_PATH environment variable to the path of your SSL certificate file",
    );
    process.exit(1);
  }

  try {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    https.createServer(options, app).listen(HTTPS_PORT, () => {
      console.log(`Server running on https://localhost:${HTTPS_PORT}`);
    });
  } catch (error) {
    console.error(
      "Failed to start HTTPS server:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

export default app;
