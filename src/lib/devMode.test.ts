import { describe, expect, it } from 'vitest';
import { isDevMode } from './devMode';

describe('isDevMode', () => {
  it.each(['?dev', '?a=1&dev', '?dev=1'])('%s이면 true', (search) => {
    expect(isDevMode(search)).toBe(true);
  });

  it.each(['', '?', '?a=1', '?devmode'])('%s이면 false', (search) => {
    expect(isDevMode(search)).toBe(false);
  });
});
