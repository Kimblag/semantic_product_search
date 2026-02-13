import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './application/auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';

@Module({
  // register in imports the modules needed like UsersModule and JwtModule.
  // JwtModule should be configured asynchronously using JwtModule.registerAsync ecause we are using
  // factories to get the configuration values from ConfigService.
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(
            configService.getOrThrow<string>('JWT_EXPIRES_IN'),
            10,
          ),
          issuer: configService.getOrThrow<string>('JWT_ISSUER'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],

  // export JWTModule with the configuration to be used in other modules.
  // We have only a source of truth for the JWT configuration.
  exports: [JwtModule],
})
export class AuthModule {}
