module.exports = {
  apps: [
    {
      name: 'client',
      cwd: './client',
      script: 'npm',
      args: 'run start --port 5173',
      env: {
        PORT: 5173,
        NODE_ENV: 'production'
      },
      env_development: {
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
      args: 'run preview -- --host',
      env: {
        PORT: 5174,
        NODE_ENV: 'production'
      },
      env_development: {
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
        HOST: '0.0.0.0',
        NODE_ENV: 'production'
      },
      env_development: {
        PORT: 5001,
        HOST: 'localhost',
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true
    }
  ]
};