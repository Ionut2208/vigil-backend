const { faker } = require('@faker-js/faker');
const { WebSocket } = require('ws');
// SSMS Models (Relational/3NF)
const Agent = require('../models/Agent');
const Sector = require('../models/Sector');
// MongoDB Model (NoSQL for Silver Challenge)
const ChatMessage = require('../models/ChatMessage');

let generationInterval = null;
let wss = null;

const initWebSocket = (server) => {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log("📡 NEW OPERATIVE LINKED: Mobile unit has connected to HQ.");
        
        ws.send(JSON.stringify({ 
            type: 'SYSTEM_MESSAGE', 
            content: 'Secure WebSocket link established with Vigil HQ.' 
        }));

        // SILVER: Listen for incoming chat messages
        ws.on('message', async (rawData) => {
            try {
                const data = JSON.parse(rawData);

                if (data.type === 'SEND_CHAT_MESSAGE') {
                    // 1. Persist to NoSQL (MongoDB) as required for Silver
                    const savedMsg = await ChatMessage.create({
                        sender: data.username,
                        text: data.text,
                        role: data.role,
                        timestamp: new Date()
                    });

                    // 2. Broadcast to all clients (Real-time requirement)[cite: 1]
                    broadcast({
                        type: 'NEW_CHAT_MESSAGE',
                        payload: savedMsg
                    });
                }
            } catch (err) {
                console.error("❌ CHAT ERROR:", err);
            }
        });

        ws.on('error', (err) => console.error("WebSocket Error:", err));
    });

    console.log("📡 WEBSOCKET SYSTEM: Online.");
};

const broadcast = (data) => {
    if (!wss) return;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

const startGeneration = () => {
    if (generationInterval) {
        console.log("⚠️ GENERATOR: Loop already active.");
        return;
    }

    console.log("🚀 GENERATOR: Initiating persistent agent recruitment...");
    
    generationInterval = setInterval(async () => {
        try {
            const randomSectorName = faker.location.city();
            
            const [sector] = await Sector.findOrCreate({
                where: { name: randomSectorName }
            });

            const newAgent = await Agent.create({
                codename: `${faker.person.firstName()}-${faker.number.int({ min: 10, max: 99 })}`,
                clearance: faker.number.int({ min: 1, max: 5 }),
                bio: `RECRUITED: ${faker.person.jobTitle()}. Skills: ${faker.company.catchPhraseDescriptor()}.`,
                sectorId: sector.id
            });

            broadcast({ 
                type: 'AGENT_ADDED', 
                agent: {
                    ...newAgent.toJSON(),
                    sector: randomSectorName
                },
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (err) {
            console.error("❌ GENERATOR ERROR:", err);
        }
    }, 5000);
};

const stopGeneration = () => {
    if (generationInterval) {
        clearInterval(generationInterval);
        generationInterval = null;
        broadcast({ 
            type: 'SYSTEM_MESSAGE', 
            content: 'Intelligence feed has been deactivated.' 
        });
    }
};

module.exports = { 
    initWebSocket, 
    startGeneration, 
    stopGeneration 
};