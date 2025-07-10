import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService as NestLoggerService } from '@paystackhq/nestjs-observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingService } from './logging.service';
import { PaymentService } from './payment.service';
import { UserService } from './user.service';

describe('AppController', () => {
  let appController: AppController;
  let mockAppService: any;
  let mockUserService: any;
  let mockPaymentService: any;
  let mockLoggingService: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    // Create mock LoggerService (dependency of LoggingService)
    mockLoggerService = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      fatal: vi.fn(),
      createChildLogger: vi.fn().mockReturnValue({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
        fatal: vi.fn(),
        createChildLogger: vi.fn(),
      }),
      addContext: vi.fn(),
      clearContext: vi.fn(),
    };

    // Create mock objects
    mockAppService = {
      getHello: vi.fn().mockResolvedValue('Hello World!'),
      getStatus: vi.fn().mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }),
      performComplexOperation: vi.fn().mockResolvedValue({
        result: 'Complex operation completed',
        processedAt: new Date().toISOString(),
        duration: '100ms',
      }),
    };

    mockUserService = {
      getUserById: vi.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
      createUser: vi.fn().mockResolvedValue({ id: '2', name: 'New User' }),
      getUserProfile: vi.fn().mockResolvedValue({ profile: 'data' }),
      validateUser: vi.fn().mockResolvedValue(true),
      getAdvancedUserProfile: vi.fn().mockResolvedValue({ advanced: 'profile' }),
    };

    mockPaymentService = {
      processPayment: vi.fn().mockResolvedValue({ id: 'pay_123', status: 'completed' }),
      validatePayment: vi.fn().mockResolvedValue(true),
      getPaymentStatus: vi.fn().mockResolvedValue('completed'),
      refundPayment: vi.fn().mockResolvedValue({ id: 'refund_123', status: 'refunded' }),
      processSensitiveData: vi.fn().mockResolvedValue(undefined),
    };

    mockLoggingService = {
      logInfo: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
      logDebug: vi.fn().mockResolvedValue(undefined),
      logWarning: vi.fn().mockResolvedValue(undefined),
      logActivity: vi.fn().mockResolvedValue(undefined),
      logUserAction: vi.fn().mockResolvedValue(undefined),
      logPerformanceMetrics: vi.fn().mockResolvedValue(undefined),
      logBusinessEvent: vi.fn().mockResolvedValue(undefined),
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
      logExceptionWithContext: vi.fn().mockResolvedValue(undefined),
      demonstrateContextPersistence: vi.fn().mockResolvedValue(undefined),
      demonstrateContextUpdates: vi.fn().mockResolvedValue(undefined),
      demonstrateComprehensiveLogging: vi.fn().mockResolvedValue(undefined),
    };

    // Create testing module using overrideProvider pattern (NestJS best practice)
    const moduleBuilder = Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, UserService, PaymentService, LoggingService, NestLoggerService],
    })
      .overrideProvider(AppService)
      .useValue(mockAppService)
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .overrideProvider(PaymentService)
      .useValue(mockPaymentService)
      .overrideProvider(LoggingService)
      .useValue(mockLoggingService)
      .overrideProvider(NestLoggerService)
      .useValue(mockLoggerService);

    const app: TestingModule = await moduleBuilder.compile();
    appController = app.get<AppController>(AppController);
  });

  describe('Basic Endpoints', () => {
    it('should return "Hello World!"', async () => {
      const result = await appController.getHello();
      expect(result).toBe('Hello World!');
      expect(mockAppService.getHello).toHaveBeenCalledTimes(1);
    });

    it('should return status object', async () => {
      const result = await appController.getStatus();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(mockAppService.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should perform complex operation', async () => {
      const result = await appController.performComplexOperation();
      expect(result).toHaveProperty('result', 'Complex operation completed');
      expect(result).toHaveProperty('processedAt');
      expect(result).toHaveProperty('duration', '100ms');
      expect(mockAppService.performComplexOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Endpoints', () => {
    it('should get user by id', async () => {
      const result = await appController.getUserById('1');
      expect(result).toEqual({ id: '1', name: 'Test User' });
      expect(mockUserService.getUserById).toHaveBeenCalledWith('1');
    });

    it('should create user', async () => {
      const userData = { name: 'New User', email: 'test@example.com' };
      const result = await appController.createUser(userData);
      expect(result).toEqual({ id: '2', name: 'New User' });
      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('Payment Endpoints', () => {
    it('should process payment', async () => {
      const paymentData = { amount: 100, currency: 'USD', customerId: '1', method: 'card' };
      const result = await appController.processPayment(paymentData);
      expect(result).toEqual({ id: 'pay_123', status: 'completed' });
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(paymentData);
    });

    it('should validate payment', async () => {
      const result = await appController.validatePayment('pay_123');
      expect(result).toBe(true);
      expect(mockPaymentService.validatePayment).toHaveBeenCalledWith('pay_123');
    });
  });

  describe('Logging Endpoints', () => {
    it('should log info', async () => {
      await appController.logInfo({ message: 'test message' });
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('test message');
    });

    it('should log error', async () => {
      await appController.logError({ error: 'test error', context: 'test context' });
      expect(mockLoggingService.logError).toHaveBeenCalledWith('test error', 'test context');
    });

    it('should demonstrate context persistence', async () => {
      const result = await appController.demonstrateContextPersistence();
      expect(result).toEqual({
        message: 'Context persistence demonstration completed. Check logs for structured output.',
      });
      expect(mockLoggingService.demonstrateContextPersistence).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw HttpException for error test', async () => {
      await expect(appController.errorTest()).rejects.toThrow(
        new HttpException('Test error for tracing', HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });
  });
});
