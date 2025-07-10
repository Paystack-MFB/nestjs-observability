import { Injectable } from '@nestjs/common';
import { addSpanAttribute, addSpanAttributes, getCurrentSpan, TraceClass } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class UserService {
  async findUser(id: string): Promise<{ id: string; name: string; email: string }> {
    // Example: Manually add span attributes for tracking
    addSpanAttribute('user.id', id);
    addSpanAttribute('operation.type', 'user-lookup');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const user = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
    };

    // Example: Add multiple attributes at once
    addSpanAttributes({
      'user.found': true,
      'user.name': user.name,
      'user.email': user.email, // This will be redacted due to sensitive pattern matching
      'response.size': JSON.stringify(user).length,
    });

    return user;
  }

  async updateUser(id: string, data: { name?: string; email?: string }): Promise<void> {
    // Example: Get current span for advanced operations
    const span = getCurrentSpan();
    if (span) {
      span.setAttribute('user.id', id);
      span.setAttribute('operation.type', 'user-update');
    }

    // Manually add attributes for the fields being updated
    addSpanAttribute('update.fields', Object.keys(data).join(','));

    // Example: Conditionally add attributes
    if (data.name) {
      addSpanAttribute('update.name', data.name);
    }

    if (data.email) {
      addSpanAttribute('update.email', data.email); // This will be redacted
    }

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 150));

    addSpanAttribute('operation.success', true);
  }

  async deleteUser(id: string): Promise<void> {
    // Example: Add context about the operation
    addSpanAttributes({
      'user.id': id,
      'operation.type': 'user-delete',
      'operation.critical': true,
    });

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 50));

    addSpanAttribute('operation.success', true);
  }
}
