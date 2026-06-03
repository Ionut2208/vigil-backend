const Agent = require('../models/Agent');
const Sector = require('../models/Sector');
const { Sequelize } = require('sequelize');

// GET all agents (with Pagination)
exports.getAllAgents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    // findAndCountAll is perfect for pagination[cite: 1]
    const { count, rows } = await Agent.findAndCountAll({
      include: [{ model: Sector, attributes: ['name'] }], // Join with Sector for 3NF
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve agents from database." });
  }
};

// GET Statistics (Aggregations)
exports.getStats = async (req, res) => {
  try {
    const totalActiveAssets = await Agent.count();

    // Calculate Average Clearance using Sequelize function[cite: 1]
    const avgClearance = await Agent.findAll({
      attributes: [[Sequelize.fn('AVG', Sequelize.col('clearance')), 'avg']]
    });

    // Group by Sector to get distribution[cite: 1]
    const sectorStats = await Agent.findAll({
      attributes: [
        [Sequelize.col('Sector.name'), 'sector'],
        [Sequelize.fn('COUNT', Sequelize.col('Agent.id')), 'count']
      ],
      include: [{ model: Sector, attributes: [] }],
      group: ['Sector.name'],
      raw: true
    });

    res.json({
      totalActiveAssets,
      sectorDistribution: sectorStats,
      avgClearance: parseFloat(avgClearance[0].dataValues.avg || 0).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate intelligence statistics." });
  }
};

// CREATE Agent
exports.createAgent = async (req, res) => {
  try {
    const { codename, sectorName, clearance, bio } = req.body;

    // 1. Find or create the sector first (to maintain 3NF)[cite: 9]
    const [sector] = await Sector.findOrCreate({
      where: { name: sectorName }
    });

    // 2. Create the agent linked to that sector ID
    const newAgent = await Agent.create({
      codename,
      clearance,
      bio,
      sectorId: sector.id
    });

    res.status(201).json(newAgent);
  } catch (err) {
    res.status(400).json({ error: "Validation failed or database error." });
  }
};

// UPDATE Agent
exports.updateAgent = async (req, res) => {
  try {
    const id = req.params.id;
    const { sectorName, ...updateData } = req.body;

    const agent = await Agent.findByPk(id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    // If sector is being updated, handle the 3NF relationship[cite: 9]
    if (sectorName) {
      const [sector] = await Sector.findOrCreate({ where: { name: sectorName } });
      updateData.sectorId = sector.id;
    }

    await agent.update(updateData);
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
};

// DELETE Agent
exports.deleteAgent = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Agent.destroy({ where: { id } });

    if (!deleted) return res.status(404).json({ error: "Agent not found" });
    
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Deletion failed." });
  }
};