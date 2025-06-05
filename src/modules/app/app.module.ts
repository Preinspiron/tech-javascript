import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import configurations from '../../configurations';
import { User } from '../user/models/user.model';
import { AuthModule } from '../auth/auth.module';
import { Watchlist } from '../watchlist/models/watchlist.model';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { Token } from '../token/models/token.model';
import { join } from 'path';
import { Pixel } from '../pixel/models/pixel.model';
import { PixelModule } from '../pixel/pixel.module';
import { Event } from '../event/models/event.model';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../../', 'public'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env' : '.local.env',
      load: [configurations],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('host'),
        port: configService.get('db_port'),
        username: configService.get('db_user'),
        password: configService.get('db_password'),
        database: configService.get('db_database'),
        synchronize: true,
        autoLoadModels: true,
        models: [User, Watchlist, Token, Pixel, Event],
        dialectOptions: {
          ssl:
            process.env.NODE_ENV === 'production'
              ? {
                  require: true,
                  rejectUnauthorized: false,
                }
              : undefined,
        },
      }),
    }),
    PixelModule,
    UserModule,
    AuthModule,
    WatchlistModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
