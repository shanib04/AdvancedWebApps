module.exports = {
  apps: [
    {
      name: "REST SERVER",
      script: "./dist/src/server.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "FRONTEND SERVER",
      script: "npm",
      args: "run preview",
      cwd: "./frontend",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
