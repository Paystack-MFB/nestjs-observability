import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingService } from './logging.service';
import { PaymentService } from './payment.service';
import { UserService } from './user.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let userService: UserService;
  let paymentService: PaymentService;
  let loggingService: LoggingService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: vi.fn().mockResolvedValue('Hello World!'),
            getStatus: vi.fn().mockResolvedValue({ status: 'ok' }),
            getHealth: vi.fn().mockResolvedValue({ healthy: true }),
            performComplexOperation: vi.fn().mockResolvedValue({ result: 'done' }),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: vi.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
            createUser: vi.fn().mockResolvedValue({ id: '2', name: 'New User' }),
            getUserProfile: vi.fn().mockResolvedValue({ profile: 'data' }),
            validateUser: vi.fn().mockResolvedValue(true),
            getAdvancedUserProfile: vi.fn().mockResolvedValue({ advanced: 'profile' }),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            processPayment: vi.fn().mockResolvedValue({ id: 'pay_123', status: 'completed' }),
            validatePayment: vi.fn().mockResolvedValue(true),
            getPaymentStatus: vi.fn().mockResolvedValue('completed'),
            refundPayment: vi.fn().mockResolvedValue({ id: 'refund_123', status: 'refunded' }),
            processSensitiveData: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            logInfo: vi.fn().mockResolvedValue(undefined),
            logError: vi.fn().mockResolvedValue(undefined),
            logDebug: vi.fn().mockResolvedValue(undefined),
            logWarning: vi.fn().mockResolvedValue(undefined),
            logActivity: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
    userService = app.get<UserService>(UserService);
    paymentService = app.get<PaymentService>(PaymentService);
    loggingService = app.get<LoggingService>(LoggingService);
  });

  describe('root', () => {
    it('should return "Hello World!"', async () => {
      expect(await appController.getHello()).toBe('Hello World!');
    });
  });

  describe('status', () => {
    it('should return status', async () => {
      const result = await appController.getStatus();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('health', () => {
    it('should return health check', async () => {
      const result = await appController.getHealth();
      expect(result).toEqual({ healthy: true });
    });
  });

  describe('user endpoints', () => {
    it('should get user by id', async () => {
      const result = await appController.getUserById('1');
      expect(result).toEqual({ id: '1', name: 'Test User' });
      expect(userService.getUserById).toHaveBeenCalledWith('1');
    });

    it('should create user', async () => {
      const userData = { name: 'New User', email: 'test@example.com' };
      const result = await appController.createUser(userData);
      expect(result).toEqual({ id: '2', name: 'New User' });
      expect(userService.createUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('payment endpoints', () => {
    it('should process payment', async () => {
      const paymentData = { amount: 100, currency: 'USD', customerId: '1', method: 'card' };
      const result = await appController.processPayment(paymentData);
      expect(result).toEqual({ id: 'pay_123', status: 'completed' });
      expect(paymentService.processPayment).toHaveBeenCalledWith(paymentData);
    });

    it('should validate payment', async () => {
      const result = await appController.validatePayment('pay_123');
      expect(result).toBe(true);
      expect(paymentService.validatePayment).toHaveBeenCalledWith('pay_123');
    });
  });

  describe('logging endpoints', () => {
    it('should log info', async () => {
      await appController.logInfo({ message: 'test message' });
      expect(loggingService.logInfo).toHaveBeenCalledWith('test message');
    });

    it('should log error', async () => {
      await appController.logError({ error: 'test error', context: 'test context' });
      expect(loggingService.logError).toHaveBeenCalledWith('test error', 'test context');
    });
  });
});
