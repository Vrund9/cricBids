import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt.guard'

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET
        if (!secret || (process.env.NODE_ENV === 'production' && secret === 'change-me-in-production')) {
          throw new Error('JWT_SECRET must be set to a strong random value')
        }
        return { secret, signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any } }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
