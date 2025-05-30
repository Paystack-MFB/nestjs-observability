import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  describe('root', () => {
    it('should return a hello message', () => {
      const appService = new AppService();
      const appController = new AppController(appService);

      const result = appController.getHello();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should be one of the predefined messages
      const validMessages = ['Hello World!', 'Welcome to NestJS Observability!', 'Monitoring is working!'];
      expect(validMessages).toContain(result);
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const appService = new AppService();
      const appController = new AppController(appService);

      const result = appController.getHealth();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.memory).toBe('object');
    });
  });

  describe('AppService', () => {
    it('should return a valid hello message', () => {
      const appService = new AppService();
      const result = appService.getHello();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should complete async work', async () => {
      const appService = new AppService();

      // This should not throw an error
      await expect(appService.doAsyncWork()).resolves.toBeUndefined();
    });
  });
});
