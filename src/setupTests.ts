import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup environment for React Testing Library/JSDOM
vi.mock('jsdom-testing-library');
vi.mock('@testing-library/jest-dom');

// Cleanup after each test
afterEach(() => {
  cleanup();
});
