const config = {
     PORT: Number(process.env.PORT) || 4003,
     SERVICE_NAME: require('../../package.json').name,
     NODE_ENV: process.env.NODE_ENV || 'development',
     LOG_LEVEL: process.env.LOG_LEVEL || 'info',
     REDIS_URL: process.env.REDIS_URL,
     DATABASE_URL: process.env.DATABASE_URL,
     ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

     INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY,
}

module.exports = {config};