import { Controller, Get } from '@nestjs/common';
import { NoTraceClass } from '@paystackhq/nestjs-observability';

/**
 * Health check controller that is excluded from auto-tracing
 *
 * This controller handles health checks and monitoring endpoints
 * that don't need to be traced for performance and noise reduction.
 */
@Controller('health')
@NoTraceClass() // This decorator excludes the entire controller from auto-tracing
export class HealthController {
  /**
   * Basic health check endpoint
   * This method will NOT be traced automatically
   */
  @Get()
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check endpoint
   * This method will NOT be traced automatically
   */
  @Get('ready')
  getReadiness(): { ready: boolean; timestamp: string } {
    return {
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness check endpoint
   * This method will NOT be traced automatically
   */
  @Get('live')
  getLiveness(): { alive: boolean; timestamp: string } {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * System metrics endpoint
   * This method will NOT be traced automatically
   */
  @Get('metrics')
  getMetrics(): { uptime: number; memory: NodeJS.MemoryUsage; timestamp: string } {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Version information endpoint
   * This method will NOT be traced automatically
   */
  @Get('version')
  getVersion(): { version: string; nodeVersion: string; timestamp: string } {
    return {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }
}
