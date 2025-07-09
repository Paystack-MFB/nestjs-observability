import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggingService } from './logging.service';
import { PaymentService } from './payment.service';
import { UserService } from './user.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    private readonly loggingService: LoggingService
  ) {}

  @Get()
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Get('status')
  async getStatus(): Promise<any> {
    return this.appService.getStatus();
  }

  @Get('complex')
  async performComplexOperation(): Promise<any> {
    return this.appService.performComplexOperation();
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string): Promise<any> {
    return this.userService.getUserById(id);
  }

  @Post('users')
  async createUser(@Body() userData: { name: string; email: string }): Promise<any> {
    return this.userService.createUser(userData);
  }

  @Get('users/:id/profile')
  async getUserProfile(@Param('id') id: string): Promise<any> {
    return this.userService.getUserProfile(id);
  }

  @Post('users/validate')
  async validateUser(@Body() userData: { email: string; name: string }): Promise<boolean> {
    return this.userService.validateUser(userData);
  }

  @Get('users/:id/advanced-profile')
  async getAdvancedUserProfile(@Param('id') id: string): Promise<any> {
    return this.userService.getAdvancedUserProfile(id);
  }

  @Post('payments')
  async processPayment(
    @Body() paymentData: { amount: number; currency: string; customerId: string; method: string }
  ): Promise<any> {
    return this.paymentService.processPayment(paymentData);
  }

  @Get('payments/:id/validate')
  async validatePayment(@Param('id') id: string): Promise<boolean> {
    return this.paymentService.validatePayment(id);
  }

  @Get('payments/:id/status')
  async getPaymentStatus(@Param('id') id: string): Promise<string> {
    return this.paymentService.getPaymentStatus(id);
  }

  @Post('payments/:id/refund')
  async refundPayment(@Param('id') id: string): Promise<any> {
    return this.paymentService.refundPayment(id);
  }

  @Post('payments/sensitive')
  async processSensitivePayment(@Body() data: any): Promise<void> {
    return this.paymentService.processSensitiveData(data);
  }

  // ==== BASIC LOGGING ENDPOINTS ====

  @Post('logs/info')
  async logInfo(@Body() body: { message: string }): Promise<void> {
    return this.loggingService.logInfo(body.message);
  }

  @Post('logs/error')
  async logError(@Body() body: { error: string; context?: string }): Promise<void> {
    return this.loggingService.logError(body.error, body.context);
  }

  @Post('logs/debug')
  async logDebug(@Body() body: { message: string }): Promise<void> {
    return this.loggingService.logDebug(body.message);
  }

  @Post('logs/warning')
  async logWarning(@Body() body: { message: string }): Promise<void> {
    return this.loggingService.logWarning(body.message);
  }

  @Post('logs/activity')
  async logActivity(@Body() body: { activity: string; userId?: string }): Promise<void> {
    return this.loggingService.logActivity(body.activity, body.userId);
  }

  // ==== ENHANCED LOGGING ENDPOINTS ====

  @Post('logs/user-action')
  async logUserAction(@Body() body: { action: string; userId: string; metadata?: Record<string, any> }): Promise<void> {
    return this.loggingService.logUserAction(body.action, body.userId, body.metadata);
  }

  @Post('logs/performance')
  async logPerformanceMetrics(@Body() body: { operation: string; duration: number }): Promise<void> {
    return this.loggingService.logPerformanceMetrics(body.operation, body.duration);
  }

  @Post('logs/business-event')
  async logBusinessEvent(@Body() body: { eventType: string; eventData: Record<string, any> }): Promise<void> {
    return this.loggingService.logBusinessEvent(body.eventType, body.eventData);
  }

  @Post('logs/security-event')
  async logSecurityEvent(@Body() body: { event: string; userId: string; ipAddress: string }): Promise<void> {
    return this.loggingService.logSecurityEvent(body.event, body.userId, body.ipAddress);
  }

  @Post('logs/exception')
  async logException(@Body() body: { error: string; context: Record<string, any> }): Promise<void> {
    const error = new Error(body.error);
    return this.loggingService.logExceptionWithContext(error, body.context);
  }

  // ==== CONTEXT MANAGEMENT DEMONSTRATION ENDPOINTS ====

  @Get('logs/demo/context-persistence')
  async demonstrateContextPersistence(): Promise<{ message: string }> {
    await this.loggingService.demonstrateContextPersistence();
    return { message: 'Context persistence demonstration completed. Check logs for structured output.' };
  }

  @Get('logs/demo/context-updates')
  async demonstrateContextUpdates(): Promise<{ message: string }> {
    await this.loggingService.demonstrateContextUpdates();
    return { message: 'Context updates demonstration completed. Check logs for context management.' };
  }

  @Get('logs/demo/comprehensive')
  async demonstrateComprehensiveLogging(): Promise<{ message: string }> {
    await this.loggingService.demonstrateComprehensiveLogging();
    return { message: 'Comprehensive logging demonstration completed. Check logs for full transaction flow.' };
  }

  // ==== ORIGINAL ENDPOINTS ====

  @Get('error-test')
  async errorTest(): Promise<any> {
    throw new HttpException('Test error for tracing', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
