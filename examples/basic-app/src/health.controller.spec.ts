import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', () => {
      const result = controller.getReadiness();
      expect(result).toEqual({
        ready: true,
        timestamp: expect.any(String),
      });
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const result = controller.getLiveness();
      expect(result).toEqual({
        alive: true,
        timestamp: expect.any(String),
      });
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', () => {
      const result = controller.getMetrics();
      expect(result).toEqual({
        uptime: expect.any(Number),
        memory: expect.any(Object),
        timestamp: expect.any(String),
      });
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = controller.getVersion();
      expect(result).toEqual({
        version: expect.any(String),
        nodeVersion: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
