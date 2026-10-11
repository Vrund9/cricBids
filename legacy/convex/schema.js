import { v } from 'convex/values'
import { defineSchema, defineTable } from 'convex/server'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    createdAt: v.number(),
    resetToken: v.optional(v.string()),
    resetTokenExp: v.optional(v.number()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    facebook: v.optional(v.string()),
    website: v.optional(v.string()),
    currency: v.optional(v.string())
  }).index('by_email', ['email']),
  auctionSessions: defineTable({
    userId: v.id('users'),
    seriesName: v.optional(v.string()),
    seriesLogo: v.optional(v.string()),
    teamCount: v.optional(v.number()),
    unifiedBasePrice: v.optional(v.number()),
    minPlayersPerTeam: v.optional(v.number()),
    initialPrize: v.optional(v.number()),
    teams: v.optional(v.array(v.object({ id: v.number(), name: v.string(), budget: v.number(), owner: v.optional(v.string()), logo: v.optional(v.string()) }))),
    players: v.optional(v.array(v.object({ id: v.number(), name: v.string(), specialization: v.string(), photo: v.optional(v.string()), status: v.optional(v.string()), soldToTeamId: v.optional(v.number()), soldPrice: v.optional(v.number()) }))),
    currentIndex: v.optional(v.number()),
    currentBid: v.optional(v.number()),
    highestBidTeamId: v.optional(v.number()),
    bidStep: v.optional(v.number()),
    started: v.optional(v.boolean()),
    reauctionDone: v.optional(v.boolean()),
    step: v.optional(v.number()), // wizard step before auction start
    recentBids: v.optional(v.array(v.object({ teamId: v.number(), amount: v.number(), time: v.number(), playerId: v.number() }))),
    lastUpdated: v.number(),
    completed: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    shareCreatedAt: v.optional(v.number()),
    shareExpiresAt: v.optional(v.number())
  }).index('by_user', ['userId']).index('by_share', ['shareToken']),
  // archive of finished auctions (immutable snapshot)
  auctionArchives: defineTable({
    userId: v.id('users'),
    seriesName: v.string(),
    seriesLogo: v.optional(v.string()),
    teamCount: v.number(),
    unifiedBasePrice: v.optional(v.number()),
    initialPrize: v.number(),
    teams: v.array(v.object({ id: v.number(), name: v.string(), budget: v.number(), owner: v.optional(v.string()), logo: v.optional(v.string()) })),
    players: v.array(v.object({ id: v.number(), name: v.string(), specialization: v.string(), photo: v.optional(v.string()), status: v.optional(v.string()), soldToTeamId: v.optional(v.number()), soldPrice: v.optional(v.number()) })),
    totalSpent: v.number(),
    createdAt: v.number()
  }).index('by_user', ['userId'])
})
