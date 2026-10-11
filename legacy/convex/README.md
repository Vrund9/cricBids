# Convex Integration Notes

Run `npx convex dev` to start the Convex backend (after installing dependencies).

This directory contains:
- `schema.ts` defining `users` table
- `auth.ts` with mutations for signup, login, password reset request, and reset

Client usage (example):
```ts
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
const signup = useMutation(api.auth.signup)
```
