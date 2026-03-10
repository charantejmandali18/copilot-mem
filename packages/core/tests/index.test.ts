import { describe, it, expect } from 'vitest';
import { Core } from '../src/index.js';

describe('@copilot-mem/core', () => {
  it('exports the Core class', () => {
    expect(Core).toBeDefined();
    expect(typeof Core).toBe('function');
  });
});
