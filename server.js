require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const mongoose = require('mongoose');

// Database & Models
const sequelize = require('./database');
const Agent = require('./models/Agent'); 
const Sector = require('./models/Sector');
const User = require('./models/User');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const RolePermission = require('./models/RolePermission');
const ChatMessage = require('./models/ChatMessage');
const Log = require('./models/Log');

User.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(User, { foreignKey: 'roleId' });

Role.belongsToMany(Permission, { 
  through: RolePermission, 
  foreignKey: 'roleId', 
  otherKey: 'permissionId' 
});

Permission.belongsToMany(Role, { 
  through: RolePermission, 
  foreignKey: 'permissionId', 
  otherKey: 'roleId' 
});

// Existing Routes & Services
const agentRoutes = require('./routes/agentRoutes');
const authRoutes = require('./routes/authRoutes');
const { initWebSocket, startGeneration, stopGeneration } = require('./services/generatorService');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

const seedSilverData = async () => {
  const adminRole = await Role.findOrCreate({ where: { name: 'ADMIN' } });
  const userRole = await Role.findOrCreate({ where: { name: 'USER' } });

  const pEdit = await Permission.findOrCreate({ where: { name: 'EDIT_AGENTS' } });
  const pView = await Permission.findOrCreate({ where: { name: 'VIEW_AGENTS' } });

  await adminRole[0].addPermissions([pEdit[0], pView[0]]);
  await userRole[0].addPermission(pView[0]);

  const salt = await bcrypt.genSalt(10);
  const hashedAdminPassword = await bcrypt.hash('admin123', salt);
  const hashedUserPassword = await bcrypt.hash('user123', salt);

  await User.findOrCreate({ 
    where: { username: 'commander' }, 
    defaults: { password: hashedAdminPassword, roleId: adminRole[0].id } 
  });
  await User.findOrCreate({ 
    where: { username: 'operative' }, 
    defaults: { password: hashedUserPassword, roleId: userRole[0].id } 
  });
};

const logUserAction = async (user, action, isMalicious = false) => {
  await Log.create({
    userId: user.username,
    groupId: user.role,
    actionInformation: action,
    isSuspicious: isMalicious
  });
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/VigilDB');
    console.log('--- 🍃 MONGODB: NoSQL Chat Storage Active ---');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }

  try {
    // ============================================================
    // DATABASE INITIALIZATION (Assignment 3 Bronze)
    // ============================================================
    // Authenticate connection to SSMS
    await sequelize.authenticate();
    console.log('--- 🛡️  VIGIL DATABASE: Connection established successfully. ---');

    await sequelize.sync({ force: false });
    console.log('--- 🛡️  VIGIL DATABASE: 3NF Models synchronized. ---');

    await seedSilverData();
    console.log('--- 🛡️  VIGIL DATABASE: Silver data seeded. ---');

  } catch (error) {
    console.error('--- ❌ DATABASE CRITICAL FAILURE ---');
    console.error(error);
    process.exit(1); // Stop the server if DB connection fails
  }

  // ============================================================
  // REST BACKEND
  // ============================================================
  app.use('/api/agents', agentRoutes);
  app.use('/api/auth', authRoutes);

  app.get('/api/chat', async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve chat history" });
  }
});

  app.get('/api/admin/observation-list', async (req, res) => {
  try {
    const { role } = req.headers;
    if (role !== 'ADMIN') return res.status(401).json({ error: "Access Denied" });

    const flaggedLogs = await Log.findAll({
      where: { isSuspicious: true },
      order: [['timestamp', 'DESC']]
    });
    res.json(flaggedLogs);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve observation list" });
  }
});

  app.get('/api/admin/logs', async (req, res) => {
    try {
        const { role } = req.headers;
        if (role !== 'ADMIN') return res.status(401).json({ error: "Access Denied" });
        
        const logs = await Log.findAll({ order: [['timestamp', 'DESC']] });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

  app.post('/api/agents/generator/start', (req, res) => {
    try { 
      startGeneration(); 
      res.status(200).json({ message: "Intelligence feed activated." }); 
    } catch (err) { 
      res.status(500).json({ error: "Failed to start generator." }); 
    }
  });

  app.post('/api/agents/generator/stop', (req, res) => {
    try { 
      stopGeneration(); 
      res.status(200).json({ message: "Intelligence feed deactivated." }); 
    } catch (err) { 
      res.status(500).json({ error: "Failed to stop generator." }); 
    }
  });

  // ============================================================
  // GRAPHQL BACKEND
  // ============================================================
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer));

  app.get('/api/mode', (req, res) => {
    res.json({ 
      modes: ['REST', 'GraphQL'], 
      graphqlEndpoint: '/graphql', 
      restEndpoint: '/api/agents' 
    });
  });

  const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

  const isProduction = process.env.NODE_ENV === 'production';

  let server;
  if (isProduction) 
  {
    server = http.createServer(app);
  } 
  else 
  {
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, 'server.key')),
      cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
    };
    server = https.createServer(sslOptions, app); 
  }

initWebSocket(server);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0',() => {
    console.log(`
    VIGIL INTELLIGENCE SERVER ACTIVE
    REST: https://localhost:${PORT}/api/agents
    GraphQL: https://localhost:${PORT}/graphql
    WebSocket: wss://localhost:${PORT}
    DB MODE: MSSQL (SSMS) - 3NF Compliant
    `);
  });
}
startServer().catch(console.error);