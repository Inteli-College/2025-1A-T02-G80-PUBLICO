# Dalio AI v3 Server - WhatsApp Bot

Servidor Node.js com TypeScript para receber e responder mensagens do WhatsApp Cloud API automaticamente.

## 🚀 Funcionalidades

- ✅ Recebe webhooks do WhatsApp Cloud API
- ✅ Responde automaticamente às mensagens recebidas
- ✅ Suporte a diferentes tipos de mensagem
- ✅ Logs detalhados das interações

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Meta for Developers
- WhatsApp Business Account configurado

## ⚙️ Configuração

### 1. Clone e instale dependências

```bash
git clone <seu-repositorio>
cd dalio-ai-v3-server
pnpm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
WHATSAPP_VERIFY_TOKEN=seu_verify_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
PORT=3001
```

### 3. Como obter as credenciais

#### Access Token:
1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá para seu app WhatsApp Business
3. Em "WhatsApp" > "API Setup"
4. Copie o "Temporary access token" ou gere um permanente

#### Phone Number ID:
1. Na mesma página "API Setup"
2. Copie o "Phone number ID" do número que você quer usar

#### Verify Token:
1. Crie uma string aleatória segura (ex: "meu_token_secreto_123")
2. Use a mesma string no webhook e no arquivo `.env`

## 🏃‍♂️ Executando

### Desenvolvimento
```bash
pnpm run dev
```

### Produção
```bash
pnpm start
```

## 🔗 Configuração do Webhook

No Meta for Developers:

1. Vá em "WhatsApp" > "Configuration"
2. Em "Webhook", clique "Edit"
3. Configure:
   - **Callback URL**: `https://seu-dominio.com/` (ou use ngrok para testes)
   - **Verify Token**: o mesmo que você colocou no `.env`
4. Subscribe aos eventos: `messages`

### Para testes locais com ngrok:

```bash
# Instale o ngrok
npm install -g ngrok

# Execute o servidor
pnpm run dev

# Em outro terminal, exponha a porta
ngrok http 3001

# Use a URL do ngrok como Callback URL
```

## 📝 Personalização da Resposta

Para alterar a mensagem padrão, edite a função no arquivo `index.ts`:

```typescript
// Resposta padrão baseada no tipo de mensagem
let responseMessage = "";

if (messageType === "text") {
  responseMessage = `Sua mensagem personalizada aqui: "${messageText}"`;
} else {
  responseMessage = "Sua resposta para outros tipos de mensagem";
}
```

## 🐛 Troubleshooting

### Erro: "Webhook verification failed"
- Verifique se o `WHATSAPP_VERIFY_TOKEN` está correto
- Confirme se a URL do webhook está acessível

### Erro: "Failed to send message"
- Verifique o `WHATSAPP_ACCESS_TOKEN`
- Confirme se o `WHATSAPP_PHONE_NUMBER_ID` está correto
- Verifique se o número tem permissão para enviar mensagens

### Servidor não inicia
- Verifique se a porta 3001 está livre
- Confirme se todas as dependências foram instaladas

## 📊 Logs

O servidor registra:
- Webhooks recebidos
- Mensagens processadas
- Respostas enviadas
- Erros de API

## 🔒 Segurança

- Mantenha seus tokens seguros
- Use HTTPS em produção
- Considere implementar rate limiting
- Valide sempre os webhooks recebidos 