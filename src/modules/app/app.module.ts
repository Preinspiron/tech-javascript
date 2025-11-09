import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { Pixel } from '../pixel/models/pixel.model';
import { PixelModule } from '../pixel/pixel.module';
import { Event } from '../event/models/event.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env' : '.local.env',
      load: [configurations],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const port = configService.get('db_port');
        const password = configService.get('db_password');
        const host = configService.get('db_host');
        const username = configService.get('db_user');
        const database = configService.get('db_database');

        console.log('Sequelize config:', {
          host,
          port: port ? parseInt(port, 10) : 5432,
          username,
          password: password ? '***' : 'EMPTY',
          passwordType: typeof password,
          database,
        });

        return {
          dialect: 'postgres',
          host: host || '',
          port: port ? parseInt(port, 10) : 5432,
          username: username || '',
          password: password ? String(password) : '',
          database: database || '',
          synchronize: true,
          autoLoadModels: true,
          models: [User, Watchlist, Token, Pixel, Event],
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        };
      },
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
