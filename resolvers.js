const Agent = require('./models/Agent');
const Sector = require('./models/Sector');
const { Sequelize } = require('sequelize');

const resolvers = {
    Query: {
        agents: async (_, { page = 1, limit = 5 }) => {
            const offset = (page - 1) * limit;
            const { count, rows } = await Agent.findAndCountAll({
                include: [{ model: Sector }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            // Mapping for GraphQL response
            const agentsWithSector = rows.map(agent => ({
                ...agent.toJSON(),
                sector: agent.Sector ? agent.Sector.name : 'Unknown'
            }));

            return {
                agents: agentsWithSector,
                nextPage: offset + limit < count ? page + 1 : null,
                hasMore: offset + limit < count,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            };
        },

        agent: async (_, { id }) => {
            const agent = await Agent.findByPk(id, { include: [Sector] });
            if (!agent) return null;
            return {
                ...agent.toJSON(),
                sector: agent.Sector ? agent.Sector.name : 'Unknown'
            };
        },

        sectors: async () => {
            return await Sector.findAll({ include: [Agent] });
        },

        stats: async () => {
            const totalActiveAssets = await Agent.count();
            
            // Average Clearance
            const avgRes = await Agent.findAll({
                attributes: [[Sequelize.fn('AVG', Sequelize.col('clearance')), 'avg']]
            });

            // Sector Distribution for 3NF
            const sectorStats = await Agent.findAll({
                attributes: [
                    [Sequelize.col('Sector.name'), 'sector'],
                    [Sequelize.fn('COUNT', Sequelize.col('Agent.id')), 'count']
                ],
                include: [{ model: Sector, attributes: [] }],
                group: ['Sector.name'],
                raw: true
            });

            return {
                totalActiveAssets,
                sectorDistribution: sectorStats,
                avgClearance: parseFloat(avgRes[0].dataValues.avg || 0).toFixed(2)
            };
        }
    },

    Mutation: {
        addAgent: async (_, { codename, sector, clearance, bio }) => {
            // Find or create sector to satisfy 3NF
            const [sectorDoc] = await Sector.findOrCreate({ where: { name: sector } });
            
            const newAgent = await Agent.create({
                codename,
                clearance,
                bio,
                sectorId: sectorDoc.id
            });

            return { ...newAgent.toJSON(), sector: sectorDoc.name };
        },

        updateAgent: async (_, { id, codename, sector, clearance, bio }) => {
            const agent = await Agent.findByPk(id);
            if (!agent) throw new Error('Agent not found');

            let sectorId = agent.sectorId;
            let sectorName = sector;

            if (sector) {
                const [sectorDoc] = await Sector.findOrCreate({ where: { name: sector } });
                sectorId = sectorDoc.id;
                sectorName = sectorDoc.name;
            }

            await agent.update({
                ...(codename && { codename }),
                ...(clearance && { clearance }),
                ...(bio && { bio }),
                sectorId
            });

            const updated = await agent.reload({ include: [Sector] });
            return { ...updated.toJSON(), sector: updated.Sector.name };
        },

        deleteAgent: async (_, { id }) => {
            const deleted = await Agent.destroy({ where: { id } });
            if (!deleted) throw new Error('Agent not found');
            return id;
        }
    }
};

module.exports = resolvers;