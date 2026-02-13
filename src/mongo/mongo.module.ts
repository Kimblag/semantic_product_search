import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URL');

        if (!uri) {
          throw new Error('MONGO_URL is not defined');
        }

        return { uri };
      },
    }),
  ],
})
export class MongoModule {}
