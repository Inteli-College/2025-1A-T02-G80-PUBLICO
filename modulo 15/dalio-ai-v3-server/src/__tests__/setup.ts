/**
 * Setup global para testes
 * Configurações que devem ser aplicadas antes de todos os testes
 */

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';

// Suprimir logs desnecessários durante os testes
const originalConsole = console.log;
console.log = (...args: any[]) => {
  // Filtrar logs do dotenv durante os testes
  const message = args[0];
  if (typeof message === 'string' && message.includes('[dotenv@')) {
    return;
  }
  originalConsole(...args);
};

export {};
