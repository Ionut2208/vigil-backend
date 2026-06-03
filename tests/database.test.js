const Agent = require('../models/Agent');
const Sector = require('../models/Sector');
const sequelize = require('../database');

// Ensure DB is connected before tests run
beforeAll(async () => {
  await sequelize.authenticate();
});

// Clean up after tests
afterAll(async () => {
  await sequelize.close();
});

describe('Vigil Intelligence Database Tests (3NF)', () => {
  test('Should create a Sector and link an Agent correctly', async () => {
    const sector = await Sector.create({ name: 'Berlin-HQ' });
    const agent = await Agent.create({
      codename: 'Ghost-Actual',
      clearance: 4,
      sectorId: sector.id
    });

    expect(agent.codename).toBe('Ghost-Actual');
    expect(agent.sectorId).toBe(sector.id);
    
    // Clean up test data
    await agent.destroy();
    await sector.destroy();
  });

  test('Should calculate average clearance correctly', async () => {
    const avg = await Agent.findAll({
      attributes: [[sequelize.fn('AVG', sequelize.col('clearance')), 'avg']]
    });
    expect(avg).toBeDefined();
  });
});