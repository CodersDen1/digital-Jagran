module.exports = {
  apps: [
    {
      name: 'client',
      cwd: './client',
      script: 'npm',
      // CHANGE: Added '-- --host' to force 0.0.0.0 binding
      args: 'run dev -- --host',
      env: {
        PORT: 5173,
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true
    },
    {
      name: 'cms',
      cwd: './cms',
      script: 'npm',
      // CHANGE: Added '-- --host' here as well
      args: 'run dev -- --host',
      env: {
        PORT: 5174,
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true
    },
    {
      name: 'server',
      cwd: './server',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 5001,
        // Ensure your server code (index.js/server.js) listens on 0.0.0.0
        // e.g., app.listen(5001, '0.0.0.0')
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true
    }
  ]
};