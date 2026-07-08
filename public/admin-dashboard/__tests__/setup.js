/**
 * Test setup: Mock browser globals for Node.js environment.
 * Provides window.supabase mock so services can be imported without errors.
 */

import { vi } from 'vitest';

// Mock window object
globalThis.window = globalThis.window || {};
globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});

// Mock supabase client
const mockSupabaseClient = {
  from: () => ({
    select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }) }),
    update: () => ({ eq: () => ({ data: {}, error: null }) }),
    delete: () => ({ eq: () => ({ error: null }) }),
  }),
  rpc: () => ({ data: { success: true }, error: null }),
  auth: { user: () => ({ id: 'mock-user-id' }) },
};

// Mock supabase createClient
globalThis.window.supabase = {
  createClient: () => mockSupabaseClient,
};

// Mock supabaseClient on window (for legacy code)
globalThis.window.supabaseClient = mockSupabaseClient;

// Mock document for descargarCSV and DOM operations
globalThis.document = globalThis.document || {
  createElement: (tag) => ({
    href: '',
    download: '',
    style: {},
    click: () => {},
    textContent: '',
    innerHTML: '',
    className: '',
    id: '',
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    remove: () => {},
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
};

// Mock URL
globalThis.URL = globalThis.URL || {
  createObjectURL: () => 'blob:mock',
  revokeObjectURL: () => {},
};

// Mock Blob
globalThis.Blob = globalThis.Blob || class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
};
