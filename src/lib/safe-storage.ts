/**
 * Safe localStorage utility with error handling
 * Handles quota exceeded errors, security errors, and private browsing mode
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage.getItem error:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('localStorage.setItem error:', error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('localStorage.removeItem error:', error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('localStorage.clear error:', error);
      return false;
    }
  },

  getJSON: <T = unknown>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('localStorage.getJSON error:', error);
      return null;
    }
  },

  setJSON: (key: string, value: unknown): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('localStorage.setJSON error:', error);
      return false;
    }
  },
};

export default safeStorage;
