require('whatwg-fetch');

// Mock das funções globais
global.alert = jest.fn();
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
};
