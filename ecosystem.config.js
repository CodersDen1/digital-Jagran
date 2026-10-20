// The application server serves both built frontends and initial-response article HTML.
module.exports = {
  apps: [
    {
      name: "digital-jagran",
      cwd: "./server",
      script: "index.js",
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: "production", PORT: 5001, HOST: "127.0.0.1" },
    },
  ],
};
