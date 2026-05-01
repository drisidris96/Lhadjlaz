module.exports = {
  apps: [
    {
      name: "lhadjlaz-api",
      cwd: "/var/www/lhadjlaz",
      script: "node",
      args: "--enable-source-maps artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        STORAGE_MODE: "local",
        LOCAL_UPLOAD_DIR: "/var/lib/lhadjlaz/uploads",
        PUBLIC_BASE_URL: "https://lhadjlaz.publicvm.com",
      },
      env_file: "/var/www/lhadjlaz/.env",
      max_memory_restart: "500M",
      out_file: "/var/log/lhadjlaz/api-out.log",
      error_file: "/var/log/lhadjlaz/api-err.log",
      time: true,
    },
  ],
};
