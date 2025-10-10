# Dalio AI

Assessor de investimentos da geração Z.

## 🚀 Funcionalidades

- ✅ **Assistente Financeiro IA** com contexto de conversa
- ✅ **Classificação de Conteúdo** malicioso automática  
- ✅ **Síntese de Voz** com ElevenLabs
- ✅ **Persistência** de mensagens (Neon Database)
- ✅ **Arquitetura em Camadas** (Models/Repositories/Services/Controllers)
- ✅ **Divisão Inteligente** de mensagens longas

## ⚙️ Configuração Rápida

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Configurar variáveis de ambiente
Crie arquivo `.env`:

```env
# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=seu_access_token
WHATSAPP_VERIFY_TOKEN=seu_verify_token  
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id

# IA e Classificação
OPENAI_API_KEY=sk-proj-xxx
HF_TOKEN=hf_xxx

# Síntese de Voz
ELEVENLABS_API_KEY=sk_xxx

# Database
DATABASE_URL=postgresql://user:pass@host/db

# Servidor
PORT=3001
```

### 3. Configurar Meta WhatsApp Business API

#### **Passo 1: Criar App**
1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. **Meus Apps** > **Criar App** > **Empresas**
3. Nome do app: `Nome do seu app`
4. **Adicionar Produto** > **WhatsApp** > **Configurar**

#### **Passo 2: Obter Credenciais**
1. Em **API Setup**:
   - **Access Token:** Clique em **Gerar Token** (temporário) ou crie permanente
   - **Phone Number ID:** Copie o ID do número de teste
   - **Verify Token:** Crie uma string segura (ex: `meu_token_123`)

#### **Passo 3: Configurar Webhook** 
1. Em **Configuration** > **Webhook**:
   - **URL do Callback:** Siga o passo 4
   - **Verificar Token:** mesmo criado no Passo 2  
   - **Verificar e Salvar**

#### **Passo 4: Teste Local **
```bash
# Terminal 1: Executar aplicação
pnpm run dev

# Terminal 2: Expor porta com ngrok  
ngrok http 3001

# Use a URL https://xxx.ngrok.io como Callback URL
```

### 4. Outras Credenciais

**OpenAI:** [Platform](https://platform.openai.com/api-keys) > **Create new secret key**  
**HuggingFace:** [Settings](https://huggingface.co/settings/tokens) > **New token**  
**ElevenLabs:** [Profile](https://elevenlabs.io/app/speech-synthesis) > **API Key**  
**Neon DB:** [Console](https://console.neon.tech/) > **Dashboard** > **Connection String**

## 🏃‍♂️ Executar

```bash
pnpm run dev
```

## 🛡️ Arquitetura

```
src/
├── models/          # Interfaces TypeScript
├── repositories/    # Queries SQL
├── services/        # Lógica de negócio  
├── controllers/     # Handlers HTTP
└── routes/          # Definição de rotas
```