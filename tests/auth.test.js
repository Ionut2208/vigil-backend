const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authRoutes = require('../routes/authRoutes');
const sequelize = require('../database');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const JWT_SECRET = "HQ_SECURE_CIPHER_KEY_2026"; 

describe('Vigil Intelligence - Authentication Security Suite', () => {

    beforeAll(async () => {
        await sequelize.sync({ force: false });
    });

    afterAll(async () => {
        await sequelize.close(); 
    });

    beforeEach(async () => {
        jest.restoreAllMocks(); // Clear any existing mocks between runs
        
        // Safe clean sequential table cleaning
        await User.destroy({ where: {} });
        await Permission.destroy({ where: {} });
        await Role.destroy({ where: {} });
        
        // Seed standard prerequisites
        await Role.create({ name: 'USER' });
        await Role.create({ name: 'ADMIN' });
    });

    describe('POST /api/auth/register', () => {
        test('should successfully establish new user with hashed passwords', async () => {
            const registryPayload = { username: 'field_agent_01', password: 'securepass123' };
            
            const res = await request(app)
                .post('/api/auth/register')
                .send(registryPayload);

            expect(res.statusCode).toBe(201); 
            expect(res.body).toHaveProperty('message', 'Operative successfully registered'); 
            expect(res.body).toHaveProperty('userId'); 

            const record = await User.findOne({ where: { username: 'field_agent_01' } });
            expect(record).not.toBeNull();
            expect(record.password).not.toBe('securepass123');
            
            const matchesSalt = await bcrypt.compare('securepass123', record.password);
            expect(matchesSalt).toBe(true); 
        });

        test('should reject missing identity parameter values completely', async () => {
            const invalidPayload = { username: 'incomplete_agent' }; 
            const res = await request(app).post('/api/auth/register').send(invalidPayload);
            
            expect(res.statusCode).toBe(400); 
            expect(res.body).toHaveProperty('error', 'Missing identity credentials'); 
        });

        test('should reject missing username parameters completely', async () => {
            const invalidPayload = { password: 'securePasswordWithoutUser!' }; 
            const res = await request(app).post('/api/auth/register').send(invalidPayload);
            
            expect(res.statusCode).toBe(400); 
            expect(res.body).toHaveProperty('error', 'Missing identity credentials'); 
        });

        test('should block registration of matching duplicate codenames', async () => {
            const salt = await bcrypt.genSalt(10); 
            const hashed = await bcrypt.hash('password125', salt); 
            await User.create({ username: 'ghost_operative', password: hashed }); 

            const duplicateRequest = { username: 'ghost_operative', password: 'differentPassword!' };
            const res = await request(app).post('/api/auth/register').send(duplicateRequest);
            
            expect(res.statusCode).toBe(400); 
            expect(res.body).toHaveProperty('error', 'Codename already registered in active registry'); 
        });
    });

    describe('POST /api/auth/login', () => {
        let mockedHashedPassword;

        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10); 
            mockedHashedPassword = await bcrypt.hash('spy_master_pass', salt); 
        });

        test('should authorize session with a valid cryptographic JWT token payload', async () => {
            // Mock User.findOne to bypass dynamic association compilation issues during testing
            jest.spyOn(User, 'findOne').mockResolvedValue({
                id: 42,
                username: 'operative_alpha',
                password: mockedHashedPassword,
                Role: {
                    name: 'USER',
                    Permissions: [{ name: 'READ' }]
                }
            });

            const credentials = { username: 'operative_alpha', password: 'spy_master_pass' };
            const res = await request(app).post('/api/auth/login').send(credentials);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token'); 
            expect(res.body.token.startsWith('Bearer ')).toBe(true); 
            
            expect(res.body).toHaveProperty('user'); 
            expect(res.body.user).toHaveProperty('username', 'operative_alpha'); 
            expect(res.body.user).toHaveProperty('role', 'USER'); 

            const tokenString = res.body.token.split(' ')[1]; 
            const parsedToken = jwt.verify(tokenString, JWT_SECRET); 
            
            expect(parsedToken).toHaveProperty('username', 'operative_alpha'); 
            expect(parsedToken).toHaveProperty('role', 'USER'); 
            expect(parsedToken.permissions).toContain('READ');
        });

        test('should flatly turn away requests utilizing incorrect password criteria', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue({
                id: 42,
                username: 'operative_alpha',
                password: mockedHashedPassword,
                Role: { name: 'USER', Permissions: [] }
            });

            const compromisedCredentials = { username: 'operative_alpha', password: 'wrong_compromised_password' };
            const res = await request(app).post('/api/auth/login').send(compromisedCredentials);

            expect(res.statusCode).toBe(401); 
            expect(res.body).toHaveProperty('error', 'Invalid Operative Credentials'); 
            expect(res.body.token).toBeUndefined();
        });

        test('should block login requests for completely untracked user identifiers', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(null);

            const nonExistentUser = { username: 'ghost_user', password: 'some_password' };
            const res = await request(app).post('/api/auth/login').send(nonExistentUser);

            expect(res.statusCode).toBe(401); 
            expect(res.body).toHaveProperty('error', 'Invalid Operative Credentials'); 
        });

        test('should handle empty or null payload credentials parameters gracefully', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(null);

            const res = await request(app).post('/api/auth/login').send({});

            expect(res.statusCode).toBe(401); 
            expect(res.body).toHaveProperty('error', 'Invalid Operative Credentials'); 
        });

        test('should catch internal errors and return a 500 status gracefully', async () => {
            jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database Connection Fail'));

            const res = await request(app).post('/api/auth/login').send({ username: 'err', password: 'err' });

            expect(res.statusCode).toBe(500);
            expect(res.body).toHaveProperty('error', 'Server Error during Authentication');
        });
    });
});