import { action, query, mutation } from './_generated/server'
import { v } from 'convex/values'
import bcrypt from 'bcryptjs'
import { api } from './_generated/api'

export const userByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db.query('users').withIndex('by_email', q => q.eq('email', email)).unique()
  }
})

export const userByResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db.query('users').filter(q => q.eq(q.field('resetToken'), token)).first()
  }
})

export const createUser = mutation({
  args: { email: v.string(), passwordHash: v.string(), name: v.string() },
  handler: async (ctx, { email, passwordHash, name }) => {
    return await ctx.db.insert('users', { email, passwordHash, name, createdAt: Date.now() })
  }
})

export const patchPasswordAndClearReset = mutation({
  args: { userId: v.id('users'), passwordHash: v.string() },
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, { passwordHash, resetToken: undefined, resetTokenExp: undefined })
  }
})

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db.query('users').withIndex('by_email', q => q.eq('email', email)).unique()
    if (!user) return { ok: true }
    const token = crypto.randomUUID()
    const exp = Date.now() + 1000 * 60 * 15
    await ctx.db.patch(user._id, { resetToken: token, resetTokenExp: exp })
    return { ok: true, token }
  }
})

export const signup = action({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, { email, password, name }) => {
    const existing = await ctx.runQuery(api.auth.userByEmail, { email })
    if (existing) throw new Error('Email already in use')
    const passwordHash = await bcrypt.hash(password, 10)
    const userId = await ctx.runMutation(api.auth.createUser, { email, passwordHash, name })
    return { userId }
  }
})

export const login = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.runQuery(api.auth.userByEmail, { email })
    if (!user) throw new Error('Invalid credentials')
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new Error('Invalid credentials')
    return { userId: user._id, name: user.name }
  }
})

export const resetPassword = action({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, newPassword }) => {
    const user = await ctx.runQuery(api.auth.userByResetToken, { token })
    if (!user || !user.resetTokenExp || user.resetTokenExp < Date.now()) throw new Error('Invalid or expired token')
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await ctx.runMutation(api.auth.patchPasswordAndClearReset, { userId: user._id, passwordHash })
    return { ok: true }
  }
})

export const getUser = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, { userId }) => {
    if(!userId) return null
    return await ctx.db.get(userId)
  }
})

export const updateProfile = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    facebook: v.optional(v.string()),
    website: v.optional(v.string()),
    currency: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args
    await ctx.db.patch(userId, fields)
    return { ok: true }
  }
})

export const changePassword = action({
  args: { userId: v.id('users'), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { userId, currentPassword, newPassword }) => {
    const user = await ctx.db.get(userId)
    if(!user) throw new Error('User not found')
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if(!valid) throw new Error('Current password incorrect')
    const passwordHash = await bcrypt.hash(newPassword,10)
    await ctx.db.patch(userId, { passwordHash })
    return { ok: true }
  }
})
