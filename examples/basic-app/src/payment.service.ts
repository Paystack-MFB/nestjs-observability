import { Injectable } from '@nestjs/common';
import { LoggerService, TraceClass } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class PaymentService {
  private readonly payments: Map<string, any> = new Map();
  constructor(private readonly logger: LoggerService) {}

  async processPayment(paymentData: {
    amount: number;
    currency: string;
    customerId: string;
    method: string;
  }): Promise<any> {
    this.logger.info(`Processing payment for customer: ${paymentData.customerId}`);

    // Simulate payment processing
    await this.delay(200);

    const payment = {
      id: Date.now().toString(),
      ...paymentData,
      status: 'completed',
      processedAt: new Date().toISOString(),
    };

    this.payments.set(payment.id, payment);
    this.logger.info(`Payment processed with ID: ${payment.id}`);

    return payment;
  }

  async validatePayment(paymentId: string): Promise<boolean> {
    this.logger.info(`Validating payment: ${paymentId}`);

    // Simulate validation checks
    await this.delay(50);

    const payment = this.payments.get(paymentId);
    const isValid = payment && payment.status === 'completed';

    this.logger.info(`Payment validation result: ${isValid}`);
    return isValid;
  }

  async getPaymentStatus(paymentId: string): Promise<string> {
    this.logger.info(`Getting payment status: ${paymentId}`);

    await this.delay(30);

    const payment = this.payments.get(paymentId);
    return payment ? payment.status : 'not_found';
  }

  async refundPayment(paymentId: string): Promise<any> {
    this.logger.info(`Processing refund for payment: ${paymentId}`);

    // Simulate refund processing
    await this.delay(150);

    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const refund = {
      id: Date.now().toString(),
      paymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: 'refunded',
      processedAt: new Date().toISOString(),
    };

    this.logger.info(`Refund processed with ID: ${refund.id}`);
    return refund;
  }

  async processSensitiveData(data: any): Promise<void> {
    this.logger.info('Processing sensitive payment data');

    // Simulate sensitive data processing
    await this.delay(100);

    // This method demonstrates argument sanitization - sensitive data like card numbers will be redacted
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
