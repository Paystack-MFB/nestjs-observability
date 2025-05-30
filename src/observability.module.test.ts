import { describe, expect, it } from 'vitest';

import { defaultObservabilityConfig } from './config/observability.config.js';
import { ObservabilityModule } from './observability.module.js';

describe('ObservabilityModule', () => {
  it('should be defined', () => {
    expect(ObservabilityModule).toBeDefined();
  });

  it('should create a module with forRoot', () => {
    const testConfig = {
      ...defaultObservabilityConfig,
      environment: 'test',
      serviceName: 'test-service',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });

  it('should create a module with forRootAsync', () => {
    const module = ObservabilityModule.forRootAsync({
      useFactory: () => ({
        ...defaultObservabilityConfig,
        environment: 'test',
        serviceName: 'test-service',
      }),
    });

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });
});
