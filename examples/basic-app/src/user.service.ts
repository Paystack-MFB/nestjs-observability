import { Injectable } from '@nestjs/common';
import {
  addSpanAttribute,
  addSpanAttributes,
  getCurrentSpan,
  LoggerService,
  TraceClass,
} from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext({ service: 'UserService' });
  }
  async getUserById(id: string): Promise<{ id: string; name: string; email: string }> {
    // Log the operation start with trace context (automatic via OpenTelemetry)
    this.logger.log('Getting user by ID', { userId: id, operation: 'getUserById' });

    // Example: Manually add span attributes for tracking
    addSpanAttribute('user.id', id);
    addSpanAttribute('operation.type', 'user-get-by-id');

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

    // Log successful operation (trace context included automatically)
    this.logger.log('User retrieved successfully', {
      userId: user.id,
      userName: user.name,
      operation: 'getUserById',
    });

    return user;
  }

  async createUser(userData: { name: string; email: string }): Promise<{ id: string; name: string; email: string }> {
    // Example: Add span attributes for user creation
    addSpanAttribute('operation.type', 'user-create');
    addSpanAttribute('user.name', userData.name);
    addSpanAttribute('user.email', userData.email); // This will be redacted

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Create user with generated ID
    const newUser = {
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
    };

    addSpanAttributes({
      'user.created': true,
      'user.id': newUser.id,
      'operation.success': true,
    });

    return newUser;
  }

  async getUserProfile(id: string): Promise<{ id: string; name: string; email: string; profile: any }> {
    addSpanAttribute('user.id', id);
    addSpanAttribute('operation.type', 'user-get-profile');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 80));

    const userProfile = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        bio: 'Software developer',
        location: 'New York, NY',
        joinedAt: '2023-01-01T00:00:00Z',
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      },
    };

    addSpanAttributes({
      'user.profile.loaded': true,
      'profile.has_bio': !!userProfile.profile.bio,
      'profile.has_location': !!userProfile.profile.location,
    });

    return userProfile;
  }

  async validateUser(userData: { email: string; name: string }): Promise<boolean> {
    addSpanAttribute('operation.type', 'user-validate');
    addSpanAttribute('user.email', userData.email); // This will be redacted
    addSpanAttribute('user.name', userData.name);

    // Simulate async validation
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Simple validation logic
    const isValid = userData.email.includes('@') && userData.name.length > 0;

    addSpanAttributes({
      'validation.email_valid': userData.email.includes('@'),
      'validation.name_valid': userData.name.length > 0,
      'validation.result': isValid,
    });

    return isValid;
  }

  async getAdvancedUserProfile(
    id: string
  ): Promise<{ id: string; name: string; email: string; profile: any; analytics: any }> {
    addSpanAttribute('user.id', id);
    addSpanAttribute('operation.type', 'user-get-advanced-profile');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 150));

    const advancedProfile = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        bio: 'Software developer',
        location: 'New York, NY',
        joinedAt: '2023-01-01T00:00:00Z',
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      },
      analytics: {
        loginCount: 42,
        lastLogin: '2023-12-01T10:30:00Z',
        activityScore: 85,
        engagementLevel: 'high',
      },
    };

    addSpanAttributes({
      'user.advanced_profile.loaded': true,
      'analytics.login_count': advancedProfile.analytics.loginCount,
      'analytics.engagement_level': advancedProfile.analytics.engagementLevel,
    });

    return advancedProfile;
  }

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
