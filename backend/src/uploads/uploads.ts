import { Throttle } from '@nestjs/throttler'
import { BadRequestException, Body, Controller, Logger, Post, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { v2 as cloudinary } from 'cloudinary'
import { diskStorage, memoryStorage } from 'multer'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomToken } from '../common/util'
import { JwtAuthGuard } from '../auth/jwt.guard'

export const UPLOAD_DIR = join(process.cwd(), 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

/**
 * With CLOUDINARY_URL set (cloudinary://key:secret@cloud), images go to Cloudinary so they survive
 * restarts on hosts without a persistent disk. Without it they are written to UPLOAD_DIR (local dev).
 * The SDK reads CLOUDINARY_URL from the environment itself.
 */
const useCloudinary = !!process.env.CLOUDINARY_URL
const CLOUD_FOLDER = process.env.CLOUDINARY_FOLDER || 'bidwicket'
const logger = new Logger('Uploads')

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export const imageUpload = FileInterceptor('file', {
  storage: useCloudinary
    ? memoryStorage()
    : diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${Date.now().toString(36)}-${randomToken(9)}.${EXT[file.mimetype]}`),
      }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true)
    else cb(new BadRequestException('Only JPG, PNG, WebP or GIF images are allowed'), false)
  },
})

function toCloudinary(file: Express.Multer.File): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        // Player photos never need more than 1200px; this keeps storage and bandwidth inside the free plan.
        { folder: CLOUD_FOLDER, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }] },
        (err, res) => (err || !res ? reject(err ?? new Error('Empty Cloudinary response')) : resolve(res.secure_url)),
      )
      .end(file.buffer)
  })
}

/** Stores an uploaded image and returns its public URL. */
export async function storeUpload(file?: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded')
  if (useCloudinary) {
    try {
      return { url: await toCloudinary(file) }
    } catch (err) {
      logger.error(`Cloudinary upload failed: ${(err as Error)?.message ?? err}`)
      throw new ServiceUnavailableException('Could not save the image. Please try again.')
    }
  }
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '')
  return { url: `${base}/uploads/${file.filename}` }
}

@Controller('uploads')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(imageUpload)
  upload(@UploadedFile() file: Express.Multer.File, @Body() _body: unknown) {
    return storeUpload(file)
  }
}
