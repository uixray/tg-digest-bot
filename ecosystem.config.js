module.exports = {
  apps: [
    {
      name: "digest-bot",
      script: "dist/index.js",
      // cwd will default to the directory where ecosystem.config.js is located
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
