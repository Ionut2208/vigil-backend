const { Sequelize } = require('sequelize');

const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false 
        }
      },
      logging: false
    })
  : new Sequelize('VigilDB', 'user', '12345', {
      host: 'localhost',
      dialect: 'mssql',
      dialectOptions: {
        options: {
          encrypt: true, 
          trustServerCertificate: true 
        }
      },
      logging: false 
    });

module.exports = sequelize;