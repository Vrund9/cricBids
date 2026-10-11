import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Shape fragments reused
const teamShape = v.object({ id: v.number(), name: v.string(), budget: v.number(), owner: v.optional(v.string()), logo: v.optional(v.string()) })
const playerShape = v.object({ id: v.number(), name: v.string(), specialization: v.string(), photo: v.optional(v.string()), status: v.optional(v.string()), soldToTeamId: v.optional(v.number()), soldPrice: v.optional(v.number()) })
const bidShape = v.object({ teamId: v.number(), amount: v.number(), time: v.number(), playerId: v.number() })

export const getLatestForUser = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, { userId }) => {
    if(!userId) return null
    const sessions = await ctx.db.query('auctionSessions').withIndex('by_user', q => q.eq('userId', userId)).collect()
    if(!sessions.length) return null
    const ordered = [...sessions].sort((a,b)=> b.lastUpdated - a.lastUpdated)
    return ordered[0]
  }
})

export const listActiveSessions = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const sessions = await ctx.db.query('auctionSessions').withIndex('by_user', q=> q.eq('userId', userId)).collect()
    return sessions.filter(s => !s.completed).sort((a,b)=> b.lastUpdated - a.lastUpdated)
  }
})

export const listArchivedAuctions = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const archives = await ctx.db.query('auctionArchives').withIndex('by_user', q=> q.eq('userId', userId)).collect()
    return archives.sort((a,b)=> b.createdAt - a.createdAt)
  }
})

export const upsertProgress = mutation({
  args: {
    userId: v.id('users'),
    step: v.optional(v.number()),
    seriesName: v.optional(v.string()),
    seriesLogo: v.optional(v.string()),
    teamCount: v.optional(v.number()),
    unifiedBasePrice: v.optional(v.number()),
    minPlayersPerTeam: v.optional(v.number()),
    initialPrize: v.optional(v.number()),
    teams: v.optional(v.array(teamShape)),
    players: v.optional(v.array(playerShape)),
    currentIndex: v.optional(v.number()),
    currentBid: v.optional(v.number()),
    highestBidTeamId: v.optional(v.number()),
    bidStep: v.optional(v.number()),
    started: v.optional(v.boolean()),
    reauctionDone: v.optional(v.boolean()),
    recentBids: v.optional(v.array(bidShape)),
    completed: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args
    const existing = await ctx.db.query('auctionSessions').withIndex('by_user', q=> q.eq('userId', userId)).collect()
    const payload = { userId, ...rest, lastUpdated: Date.now() }
    if(!existing.length){
      const id = await ctx.db.insert('auctionSessions', payload)
      return { created: true, id }
    }
    const ordered = [...existing].sort((a,b)=> b.lastUpdated - a.lastUpdated)
    const current = ordered[0]
    await ctx.db.patch(current._id, payload)
    return { created: false, id: current._id }
  }
})

export const clearSession = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db.query('auctionSessions').withIndex('by_user', q=> q.eq('userId', userId)).collect()
    for(const s of existing){
      await ctx.db.delete(s._id)
    }
    return { ok: true }
  }
})

export const archiveAuction = mutation({
  args: {
    userId: v.id('users'),
    seriesName: v.string(),
    seriesLogo: v.optional(v.string()),
    teamCount: v.number(),
    unifiedBasePrice: v.optional(v.number()),
    initialPrize: v.number(),
    teams: v.array(teamShape),
    players: v.array(playerShape)
  },
  handler: async (ctx, args) => {
    const totalSpent = args.players.filter(p=> p.status==='sold').reduce((a,p)=> a + (p.soldPrice||0), 0)
    const payload = { ...args, totalSpent, createdAt: Date.now() }
    const id = await ctx.db.insert('auctionArchives', payload)
    // mark current session completed
    const existing = await ctx.db.query('auctionSessions').withIndex('by_user', q=> q.eq('userId', args.userId)).collect()
    if(existing.length){
      const latest = [...existing].sort((a,b)=> b.lastUpdated - a.lastUpdated)[0]
      await ctx.db.patch(latest._id, { completed: true, lastUpdated: Date.now() })
    }
    return { archived: true, id }
  }
})

export const getByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const sessions = await ctx.db.query('auctionSessions').withIndex('by_share', q=> q.eq('shareToken', token)).collect()
    if(!sessions.length) return null
    const s = sessions[0]
    // Only expose readonly subset
    return {
      seriesName: s.seriesName,
      seriesLogo: s.seriesLogo,
      teams: s.teams || [],
      players: s.players || [],
      currentIndex: s.currentIndex,
      currentBid: s.currentBid,
      highestBidTeamId: s.highestBidTeamId,
      bidStep: s.bidStep,
      started: s.started,
      reauctionDone: s.reauctionDone,
      recentBids: s.recentBids || [],
      lastUpdated: s.lastUpdated,
      completed: s.completed
    }
  }
})

export const generateShareLink = mutation({
  args: { userId: v.id('users'), ttlMinutes: v.optional(v.number()) },
  handler: async (ctx, { userId, ttlMinutes }) => {
    const sessions = await ctx.db.query('auctionSessions').withIndex('by_user', q=> q.eq('userId', userId)).collect()
    if(!sessions.length) throw new Error('No session')
    const latest = [...sessions].sort((a,b)=> b.lastUpdated - a.lastUpdated)[0]
    const token = latest.shareToken || (Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,6))
    const now = Date.now()
    const ttl = (ttlMinutes && ttlMinutes>0 ? ttlMinutes : 720) * 60 * 1000 // default 12h
    await ctx.db.patch(latest._id, { shareToken: token, shareCreatedAt: now, shareExpiresAt: now + ttl, lastUpdated: now })
    return { token, expiresAt: now + ttl }
  }
})
