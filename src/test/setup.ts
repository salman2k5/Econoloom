import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // Ignore if test mocks localStorage as throwing
  }
  try {
    window.history.replaceState(null, '', '/');
  } catch {
    // Ignore if test mocks history
  }
});
