import { Logger } from '@nestjs/common'
import { v2 as cloudinary } from 'cloudinary'

const logger = new Logger('DriveMirror')
const CLOUD_FOLDER = process.env.CLOUDINARY_FOLDER || 'bidwicket'

/** Drive file id of a photo URL produced by normalizePhotoUrl, or null for any other URL. */
export function driveId(url?: string | null) {
  return url?.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([\w-]+)/)?.[1] ?? null
}

/**
 * Copies a Google Drive photo to Cloudinary and returns the Cloudinary URL.
 *
 * Google throttles Drive images per IP, and every big screen at a venue shares one, so photos
 * served from Drive go missing once a few screens are open. Cloudinary has no such limit.
 * The public id is the Drive id, so the same photo is only ever stored once.
 * Returns null when it isn't a Drive photo, Cloudinary isn't configured, or Drive refuses
 * (usually a file that isn't shared publicly) — callers keep the Drive URL then.
 */
export async function mirrorDrivePhoto(url?: string | null): Promise<string | null> {
  const id = driveId(url)
  if (!id || !process.env.CLOUDINARY_URL) return null
  try {
    const res = await cloudinary.uploader.upload(`https://lh3.googleusercontent.com/d/${id}=w1200`, {
      folder: CLOUD_FOLDER,
      public_id: `drive-${id}`,
      overwrite: false,
      resource_type: 'image',
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    })
    return res.secure_url
  } catch (err) {
    logger.warn(`Could not copy Drive photo ${id}: ${(err as { message?: string })?.message ?? err}`)
    return null
  }
}

/** Runs `fn` over `items`, at most `limit` at a time. */
export async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++])
  }))
}
