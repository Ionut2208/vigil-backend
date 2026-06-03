const typeDefs = `#graphql
  type SectorCount {
    sector: String!
    count: Int!
  }

  type Stats {
    totalActiveAssets: Int!
    sectorDistribution: [SectorCount!]!
    avgClearance: Float!
  }

  type Sector {
    id: ID!
    name: String!
    agents: [Agent!]!
  }

  type Agent {
    id: ID!
    codename: String!
    clearance: Int!
    bio: String
    sector: String!
  }

  type AgentPage {
    agents: [Agent!]!
    nextPage: Int
    hasMore: Boolean!
    totalPages: Int!
    totalItems: Int!
  }

  type Query {
    agents(page: Int, limit: Int): AgentPage!
    agent(id: ID!): Agent
    sectors: [Sector!]!
    stats: Stats!
  }

  type Mutation {
    addAgent(codename: String!, sector: String!, clearance: Int!, bio: String): Agent!
    updateAgent(id: ID!, codename: String, sector: String, clearance: Int, bio: String): Agent!
    deleteAgent(id: ID!): ID!
  }
`;

module.exports = typeDefs;
