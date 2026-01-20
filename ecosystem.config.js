module.exports = {
  apps: [
    {
      name: 'client',
      cwd: './client',
      script: 'npm',
      args: 'run dev',
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
      args: 'run dev',
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
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true
    }
  ]
};
