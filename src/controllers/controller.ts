import { Request, Response } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";
import { messageService } from "../database";

dotenv.config();

const DALIO_AI_PROMPT = `**Persona:**
Você é um assessor de investimentos chamado "Dalio", projetado especificamente para ajudar jovens da Geração Z brasileira (pessoas entre 15 e 28 anos) a conquistarem a liberdade financeira. Você é como um amigo esperto em finanças: jovem, descolado, acessível e motivador. Pense em si mesmo como um influenciador financeiro no estilo de Nath Finanças ou Thiago Nigro, mas focado na Gen Z, com toques de humor e referências pop.

**Situação:**
Você está disponível diretamente no WhatsApp, interagindo em conversas em tempo real. As interações são como mensagens de chat: rápidas, informais e contínuas. Use o histórico da conversa para manter o contexto, retomar tópicos anteriores e construir uma relação de longo prazo com o usuário.

**Tom:**
Suas respostas devem ser curtas, conversacionais, amigáveis e engajadoras. Use linguagem informal com gírias brasileiras (ex: "mano", "top", "foda", "vamos nessa"), emojis (💰, 🚀, 😎), memes leves e referências à cultura pop brasileira (ex: séries como 'Sintonia', músicas de Anitta ou influenciadores como Whindersson). Evite jargões complicados; explique tudo de forma simples e passo a passo. Mantenha um tom positivo, motivador e empático, especialmente em momentos de frustração do usuário. Adapte ao humor: mais animado com emojis se o usuário estiver empolgado; mais encorajador se frustrado.

**Objetivo:**
Guiar os usuários rumo à independência financeira, ensinando conceitos básicos de finanças pessoais, investimentos acessíveis no Brasil (como Tesouro Direto, CDBs, fundos de investimento, ações na B3, criptomoedas e apps como Nubank ou PicPay), orçamento, poupança de emergência, controle de dívidas e mindset de crescimento. Incentive hábitos sustentáveis, como investir com pouco dinheiro (ex: R$50 por mês), e foque em metas reais da Gen Z, como viajar, comprar um apê, sair da casa dos pais, equilibrar trabalho e lazer, ou lidar com inflação e economia instável no Brasil. Sempre enfatize a importância de educação financeira contínua e verificação de informações em fontes oficiais, como o site da CVM ou Banco Central.

**Guardrails:**
- NUNCA dê conselhos personalizados ou recomendações específicas de investimentos sem o disclaimer: "Lembre-se, isso não é conselho financeiro profissional. Consulte um consultor certificado ou use apps regulados pela CVM antes de investir." Repita sempre que discutir investimentos.
- Enfatize riscos: "Investimentos envolvem riscos, como perda de dinheiro. Comece pequeno e diversifique!" Com exemplos reais.
- Mantenha respostas curtas (máx. 200-300 palavras). Use listas ou bullets para clareza; divida em múltiplas mensagens se necessário.
- Para tópicos sensíveis (dívidas, ansiedade), oriente para recursos como Serasa, Procon ou CVV com empatia.
- Promova inclusão: Considere diversidade (gênero, raça, região, orientação sexual) e opções acessíveis para baixa renda.
- Recuse conteúdos ilegais/arriscados: "Isso parece arriscado e pode ser ilegal. Vamos focar em caminhos legais e seguros?"
- Privacidade: NUNCA peça dados sensíveis (CPF, senhas). Se compartilhados, responda genericamente e alerte sobre riscos.
- Se usuário <18 anos: Pare investimentos e foque em educação básica.
- Lide com repetições: Varie respostas ou pergunte por mais detalhes.
- Monitore engajamento: Reengaje com dicas leves se o usuário sumir.
- Se o usuário mencionar bets ou casas de apostas, explique que é arriscado e não é recomendado. Pois isso é um tipo de gambling e pode ser ilegal.

**Contexto Adicional:**
- Incentive ações práticas: Sugira apps (Mobills, Rico, XP), links (Tesouro Nacional) e desafios ("Desafio: rastreie gastos e me conte!"). Acompanhe progresso em interações futuras.
- Sempre pergunte sobre nível de conhecimento para personalizar.
- Use histórico: Referencie metas passadas (ex: "Lembra da viagem? Vamos investir pra isso.").
- Você é capaz de mandar áudio também. Quando for pedido para gerar o texto para áudio, apenas escreva o texto de forma normal como se fosse explicar de forma textual.
- Chain of Thought: Antes de responder, pense passo a passo internamente: 1. Analise a mensagem do usuário. 2. Lembre do histórico. 3. Escolha tom e conteúdo adequados. 4. Inclua disclaimer se necessário. 5. Finalize com chamada para ação. Não mostre esse raciocínio na resposta.

**Exemplos de Few-Shot Learning:**
Exemplo 1 (Zero-Shot: Introdução inicial sem histórico):
Usuário: Oi, quem é você?
Resposta: Oi! Sou o Dalio, seu parceiro pra liberdade financeira. Projetado pra Gen Z como você. O que quer saber hoje? Orçamento básico, investimentos no Tesouro ou dicas pra dívidas? Vamos nessa! 😎

Exemplo 2 (One-Shot: Resposta a dúvida simples):
Usuário: Como começo a investir com pouco dinheiro?
Resposta: E aí! Top que você quer começar. Pra investir com pouco, tipo R$50/mês, vai no Tesouro Direto – é seguro e rende mais que poupança. Passo a passo: 1. Baixe app de corretora como Rico. 2. Cadastre-se. 3. Escolha Tesouro Selic pra iniciantes. Lembre-se, isso não é conselho profissional – consulte CVM. Riscos: pode variar com economia. Comece pequeno! O que acha? Me conta sua meta. 💰

Exemplo 3 (Few-Shot: Conversa contínua com empatia):
Usuário (mensagem anterior): Tô endividado no cartão, mano. :(
Usuário: Me ajuda a sair disso.
Resposta: Entendo, dívidas no cartão são foda, mas vamos resolver passo a passo. 1. Liste todas dívidas no app como Serasa. 2. Negocie parcelas menores. 3. Corte gastos desnecessários pra pagar mais rápido. Se tá ansioso, liga pro CVV (188). Desafio: rastreie gastos essa semana e me atualize! Você consegue, vamos nessa. 🚀 Qual sua maior dívida?`;

const verifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN;

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Configuração do ElevenLabs
let elevenlabs: ElevenLabsClient | null = null;
const defaultVoiceId = "JBFqnCBsd6RMkjVDRZzb"; // George voice

// Função para inicializar ElevenLabs
function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenlabs) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('API Key do ElevenLabs não configurada');
    }
    elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return elevenlabs;
}

// Função para gerar prompt com contexto da conversa
async function generateContextualPrompt(whatsappNumber: string, currentMessage: string): Promise<{
  systemPrompt: string;
  userPrompt: string;
}> {
  try {
    // Buscar contexto da conversa
    const context = await messageService.getContextForAI(whatsappNumber, 8);
    
    let contextText = "";
    if (context.length > 0) {
      contextText = "\n\n**CONTEXTO DA CONVERSA ANTERIOR:**\n";
      context.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'USUÁRIO' : 'VOCÊ';
        contextText += `${role}: ${msg.content}\n`;
      });
      contextText += "\n**NOVA MENSAGEM:**\n";
    }

    return {
      systemPrompt: DALIO_AI_PROMPT,
      userPrompt: contextText + `USUÁRIO: ${currentMessage}`
    };
  } catch (error) {
    console.error('Erro ao gerar contexto:', error);
    // Fallback para mensagem sem contexto
    return {
      systemPrompt: DALIO_AI_PROMPT,
      userPrompt: `Responde a seguinte mensagem: ${currentMessage}`
    };
  }
}

// Função para salvar mensagem do usuário
async function saveUserMessage(whatsappNumber: string, messageText: string, messageType: string = 'text'): Promise<void> {
  try {
    // Buscar ou criar conversa
    const conversation = await messageService.getOrCreateConversation(whatsappNumber);
    
    // Salvar mensagem do usuário
    await messageService.saveMessage({
      conversation_id: conversation.id!,
      whatsapp_number: whatsappNumber,
      message_text: messageText,
      message_type: messageType,
      sender: 'user'
    });
  } catch (error) {
    console.error('Erro ao salvar mensagem do usuário:', error);
  }
}

// Função para salvar mensagem do bot
async function saveBotMessage(
  whatsappNumber: string, 
  messageText: string, 
  aiModel: string = 'gpt-4o-mini',
  hasAudio: boolean = false,
  voiceId?: string,
  tokensUsed?: number
): Promise<void> {
  try {
    // Buscar conversa existente
    const conversation = await messageService.getOrCreateConversation(whatsappNumber);
    
    // Salvar mensagem do bot
    await messageService.saveMessage({
      conversation_id: conversation.id!,
      whatsapp_number: whatsappNumber,
      message_text: messageText,
      message_type: hasAudio ? 'audio' : 'text',
      sender: 'bot',
      ai_model: aiModel,
      tokens_used: tokensUsed,
      has_audio: hasAudio,
      voice_id: voiceId
    });
  } catch (error) {
    console.error('Erro ao salvar mensagem do bot:', error);
  }
}

// Função para enviar mensagem via WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: {
            body: message,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("Mensagem enviada:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    throw error;
  }
}

// Função para enviar áudio via WhatsApp Cloud API
async function sendWhatsAppAudio(
  to: string,
  audioId?: string,
  audioUrl?: string
) {
  try {
    if (!audioId && !audioUrl) {
      throw new Error("É necessário fornecer audioId ou audioUrl");
    }

    const audioPayload: any = {};

    if (audioId) {
      audioPayload.id = audioId;
    } else if (audioUrl) {
      audioPayload.link = audioUrl;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "audio",
          audio: audioPayload,
        }),
      }
    );

    const result = await response.json();
    console.log("Áudio enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar áudio:", error);
    throw error;
  }
}

// Função para fazer upload de mídia para o WhatsApp
async function uploadMediaToWhatsApp(filePath: string, mimeType: string) {
  try {
    const formData = new FormData();
    let fileBuffer: Blob;

    // Verificar se é URL ou caminho local
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      // Se for URL, fazer download
      fileBuffer = await fetch(filePath).then((res) => res.blob());
    } else {
      // Se for arquivo local, ler do sistema de arquivos
      const fileData = fs.readFileSync(filePath);
      fileBuffer = new Blob([fileData], { type: mimeType });
    }

    formData.append("file", fileBuffer);
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const result = await response.json();
    console.log("Mídia enviada:", result);

    if (result.error) {
      throw new Error(`Erro da API WhatsApp: ${result.error.message}`);
    }

    return result.id; // Retorna o media_id para usar na função sendWhatsAppAudio
  } catch (error) {
    console.error("Erro ao fazer upload da mídia:", error);
    throw error;
  }
}

// Função para gerar áudio com ElevenLabs e salvar como arquivo
async function generateAudioWithElevenLabs(
  text: string,
  voiceId: string = defaultVoiceId
): Promise<string> {
  try {
    console.log(`Gerando áudio com ElevenLabs: "${text}"`);

    const elevenLabsClient = getElevenLabsClient();
    const audio = await elevenLabsClient.textToSpeech.convert(voiceId, {
      text: text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `audio_${timestamp}.mp3`;
    const filePath = path.join("./audio", fileName);

    // Garantir que o diretório existe
    if (!fs.existsSync("./audio")) {
      fs.mkdirSync("./audio", { recursive: true });
    }

    // Converter ReadableStream para Buffer e salvar
    const chunks: Uint8Array[] = [];
    const reader = audio.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filePath, buffer);

    console.log(`Áudio salvo em: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Erro ao gerar áudio com ElevenLabs:", error);
    throw error;
  }
}

// Função combinada: gerar áudio com ElevenLabs e enviar via WhatsApp
async function generateAndSendAudio(
  to: string,
  text: string,
  voiceId?: string
): Promise<void> {
  try {
    // 1. Gerar áudio com ElevenLabs
    const audioFilePath = await generateAudioWithElevenLabs(text, voiceId);

    // 2. Fazer upload para WhatsApp
    const mediaId = await uploadMediaToWhatsApp(audioFilePath, "audio/mpeg");

    // 3. Enviar áudio via WhatsApp
    await sendWhatsAppAudio(to, mediaId);

    // 4. Limpar arquivo temporário
    setTimeout(() => {
      try {
        fs.unlinkSync(audioFilePath);
        console.log(`Arquivo temporário removido: ${audioFilePath}`);
      } catch (error) {
        console.error("Erro ao remover arquivo temporário:", error);
      }
    }, 60000); // Remove após 1 minuto

    console.log(`Áudio gerado e enviado com sucesso para ${to}`);
  } catch (error) {
    console.error("Erro ao gerar e enviar áudio:", error);
    throw error;
  }
}

// Controller para verificação do webhook
export const verifyWebhook = (req: Request, res: Response) => {
  const {
    "hub.mode": mode,
    "hub.challenge": challenge,
    "hub.verify_token": token,
  } = req.query;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
};

// Controller para processar mensagens do webhook
export const handleWebhook = async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  try {
    // Verificar se há mensagens no webhook
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      for (const message of messages) {
        const from = message.from; // Número do remetente
        const messageText = message.text?.body; // Texto da mensagem
        const messageType = message.type;

        console.log(`Mensagem recebida de ${from}: ${messageText}`);

        // Salvar mensagem do usuário no banco
        await saveUserMessage(from, messageText, messageType);

        // Gerar prompt com contexto da conversa
        const { systemPrompt, userPrompt } = await generateContextualPrompt(from, messageText);

        // Verificar se o usuário quer um áudio
        if (
          messageText?.toLowerCase().includes("áudio") ||
          messageText?.toLowerCase().includes("audio")
        ) {
          try {
            // Gerar resposta com AI usando contexto
            const response = await generateText({
              system: systemPrompt,
              model: openai("gpt-4o-mini"),
              prompt: userPrompt,
            });

            // Gerar e enviar áudio com ElevenLabs
            await generateAndSendAudio(from, response.text, "bJrNspxJVFovUxNBQ0wh");

            // Salvar resposta do bot no banco
            await saveBotMessage(
              from, 
              response.text, 
              "gpt-4o-mini", 
              true, 
              "bJrNspxJVFovUxNBQ0wh",
              response.usage?.totalTokens
            );
          } catch (error) {
            console.error("Erro ao gerar/enviar áudio:", error);
            const fallbackMessage = "Desculpe, não consegui gerar o áudio no momento. Vou responder por texto:";
            await sendWhatsAppMessage(from, fallbackMessage);

            try {
              // Fallback para resposta de texto
              const response = await generateText({
                system: systemPrompt,
                model: openai("gpt-4o-mini"),
                prompt: userPrompt,
              });
              
              await sendWhatsAppMessage(from, response.text);

              // Salvar resposta do bot no banco
              await saveBotMessage(
                from, 
                `${fallbackMessage}\n\n${response.text}`, 
                "gpt-4o-mini", 
                false, 
                undefined,
                response.usage?.totalTokens
              );
            } catch (fallbackError) {
              console.error("Erro no fallback:", fallbackError);
            }
          }
        } else {
          try {
            // Resposta normal com AI usando contexto
            const response = await generateText({
              system: systemPrompt,
              model: openai("gpt-4o-mini"),
              prompt: userPrompt,
            });

            // Enviar resposta automática
            await sendWhatsAppMessage(from, response.text);

            // Salvar resposta do bot no banco
            await saveBotMessage(
              from, 
              response.text, 
              "gpt-4o-mini", 
              false, 
              undefined,
              response.usage?.totalTokens
            );
          } catch (error) {
            console.error("Erro ao gerar resposta:", error);
            const errorMessage = "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.";
            await sendWhatsAppMessage(from, errorMessage);
            
            // Salvar mensagem de erro
            await saveBotMessage(from, errorMessage, "error");
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
  }

  res.status(200).end();
};