# 🧪 Testes da API

## ✅ Dependências instaladas:
- jest, @types/jest, supertest, @types/supertest, ts-jest

## 🚀 Executar testes:

```bash
# Rodar todos os testes
pnpm test
```

## 🧪 Testes disponíveis:

### **Testes Básicos** (`src/__tests__/basic.test.ts`)
✅ Configuração Jest funcionando  
✅ Variáveis de ambiente de teste  
✅ Promises e async/await  

### **Testes de Endpoints** (`src/__tests__/endpoints.test.ts`)
✅ GET /health - Health check da API  
✅ GET / - Verificação do webhook WhatsApp (token correto)  
✅ GET / - Verificação do webhook (token incorreto = 403)  
✅ GET /rota-inexistente - Resposta 404  

## 📁 Estrutura:

```
src/
├── __tests__/
│   ├── setup.ts          # Configuração global de testes
│   ├── basic.test.ts     # Testes básicos de configuração
│   └── endpoints.test.ts # Testes dos endpoints API  
├── test-app.ts          # App Express isolado para testes
└── ...
```

## 🔧 Configuração Jest:

- `jest.config.cjs` - Compatível com ES modules
- TypeScript com ESM habilitado (`useESM: true`)
- `moduleNameMapper` corrigido (era `moduleNameMapping`)
- Setup global (`src/__tests__/setup.ts`)
- Variáveis de ambiente padronizadas para testes
- Supressão de logs desnecessários (dotenv)
- Sem warnings de configuração deprecated

## 🎯 Resultado esperado:

```
 PASS  src/__tests__/basic.test.ts
   Configuração Jest
     ✓ Jest está funcionando corretamente
     ✓ Variáveis de ambiente de teste
     ✓ Promises e async/await

 PASS  src/__tests__/endpoints.test.ts
   Endpoints da API
     ✓ GET /health - deve retornar status ok
     ✓ GET / - deve verificar webhook corretamente
     ✓ GET / - deve retornar 403 com token incorreto
     ✓ GET /rota-inexistente - deve retornar 404

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
```
