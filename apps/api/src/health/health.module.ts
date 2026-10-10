import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'football-api',
      version: '0.1.0',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}