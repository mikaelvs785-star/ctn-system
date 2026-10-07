import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { NewsModule } from './modules/news/news.module.js';
import { CommunitiesModule } from './modules/communities/communities.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    DatabaseModule,
    RolesModule,
    UsersModule,
    PrismaModule,
    AuthModule,
    NewsModule,
    CommunitiesModule,
    NotificationsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
