import 'dotenv/config'
import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { allowedOrigins } from './common/origins'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.set('trust proxy', 1)
  // Images are embedded by the web app on another origin, so allow cross-origin reads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.enableCors({ origin: allowedOrigins(), credentials: true })
  app.useBodyParser('json', { limit: '5mb' })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }))
  app.enableShutdownHooks()
  const port = Number(process.env.PORT || 4000)
  await app.listen(port)
  Logger.log(`BidWicket API ready on http://localhost:${port}`, 'Bootstrap')
}

void bootstrap()
