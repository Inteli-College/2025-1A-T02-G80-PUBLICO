// Teste básico para verificar se Jest está funcionando
describe('Configuração Jest', () => {
  
  test('Jest está funcionando corretamente', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBeTruthy();
    expect('Dalio AI').toContain('Dalio');
  });

  test('Variáveis de ambiente de teste', () => {
    // Definir uma variável de teste
    process.env.TEST_VAR = 'jest-working';
    
    expect(process.env.TEST_VAR).toBe('jest-working');
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Promises e async/await', async () => {
    const promise = Promise.resolve('sucesso');
    await expect(promise).resolves.toBe('sucesso');
    
    const asyncFunction = async () => {
      return 'async-result';
    };
    
    const result = await asyncFunction();
    expect(result).toBe('async-result');
  });

});
