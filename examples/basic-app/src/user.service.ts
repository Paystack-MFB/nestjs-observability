import { Injectable, Logger } from '@nestjs/common';
import { Trace } from 'nestjs-observability';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly users: Map<string, any> = new Map();

  constructor() {
    // Initialize with some sample data
    this.users.set('1', {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      profile: { age: 30, department: 'Engineering' },
    });
    this.users.set('2', {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      profile: { age: 28, department: 'Design' },
    });
  }

  @Trace()
  async getUserById(id: string): Promise<any> {
    this.logger.log(`Getting user by ID: ${id}`);

    // Simulate async database call
    await this.delay(50);

    const user = this.users.get(id);
    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new Error(`User with ID ${id} not found`);
    }

    this.logger.log(`User found: ${user.name}`);
    return user;
  }

  @Trace()
  async createUser(userData: { name: string; email: string }): Promise<any> {
    this.logger.log(`Creating new user: ${userData.name}`);

    // Simulate async database call
    await this.delay(100);

    const newUser = {
      id: Date.now().toString(),
      ...userData,
      profile: { age: 25, department: 'General' },
    };

    this.users.set(newUser.id, newUser);
    this.logger.log(`User created with ID: ${newUser.id}`);

    return newUser;
  }

  @Trace()
  async getUserProfile(id: string): Promise<any> {
    this.logger.log(`Getting profile for user: ${id}`);

    const user = await this.getUserById(id);

    // Simulate additional processing
    await this.delay(30);

    return {
      userId: user.id,
      profile: user.profile,
      lastAccessed: new Date().toISOString(),
    };
  }

  @Trace()
  async validateUser(userData: { email: string; name: string }): Promise<boolean> {
    this.logger.log(`Validating user: ${userData.email}`);

    // Simulate validation logic
    await this.delay(25);

    const isValid = userData.email.includes('@') && userData.name.length > 0;

    this.logger.log(`User validation result: ${isValid}`);
    return isValid;
  }

  @Trace()
  async getAdvancedUserProfile(id: string): Promise<any> {
    this.logger.log(`Getting advanced profile for user: ${id}`);

    const user = await this.getUserById(id);
    const profile = await this.getUserProfile(id);

    // Simulate multiple service calls
    await this.delay(75);

    return {
      ...user,
      ...profile,
      permissions: ['read', 'write'],
      lastLogin: new Date().toISOString(),
      sessionCount: Math.floor(Math.random() * 100),
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
