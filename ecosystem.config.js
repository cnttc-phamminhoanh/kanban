module.exports = {
  apps: [
    {
      name: "kanban",
      script: "./server.js",
      cwd: "/home/it/kanban",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 4001,
      },
    },
  ],
};
