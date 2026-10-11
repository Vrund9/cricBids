import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomToken } from '../common/util'
import { JwtAuthGuard } from '../auth/jwt.guard'

export const UPLOAD_DIR = join(process.cwd(), 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export const imageUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now().toString(36)}-${randomToken(9)}.${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true)
    else cb(new BadRequestException('Only JPG, PNG, WebP or GIF images are allowed'), false)
  },
})

export function publicUrl(file?: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded')
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '')
  return { url: `${base}/uploads/${file.filename}` }
}

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(imageUpload)
  upload(@UploadedFile() file: Express.Multer.File, @Body() _body: unknown) {
    return publicUrl(file)
  }
}
