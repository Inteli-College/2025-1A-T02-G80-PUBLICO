import { Request, Response } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";
import { conversationService, messageService } from "../services";
import { DALIO_AI_PROMPT } from "../lib/utils/prompt";

dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;

const verifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN;

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Configuração do ElevenLabs
let elevenlabs: ElevenLabsClient | null = null;
const defaultVoiceId = "JBFqnCBsd6RMkjVDRZzb";

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
    // Buscar contexto da conversa usando o novo service
    const context = await conversationService.getContextForAI(whatsappNumber, 8);
    
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
    // Buscar ou criar conversa usando o novo service
    const conversation = await conversationService.getOrCreateConversation(whatsappNumber);
    
    // Salvar mensagem do usuário usando o novo messageService
    await messageService.saveUserMessage(whatsappNumber, messageText, messageType, conversation.id);
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
    // Salvar mensagem do bot usando o novo messageService
    await messageService.saveBotMessage(
      whatsappNumber, 
      messageText, 
      aiModel, 
      hasAudio, 
      voiceId, 
      tokensUsed
    );
  } catch (error) {
    console.error('Erro ao salvar mensagem do bot:', error);
  }
}

// Função para quebrar mensagem em partes menores de forma inteligente (3-4 mensagens)
function splitMessageIntoParts(text: string, maxLength: number = 400): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  
  let paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 1) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    paragraphs = [];
   
    for (let i = 0; i < sentences.length; i += 2) {
      const group = sentences.slice(i, i + 2).join(' ');
      if (group.length <= maxLength * 1.2) { 
        paragraphs.push(group);
      } else {
        paragraphs.push(...sentences.slice(i, i + 2));
      }
    }
  }
  
  let currentPart = "";
  
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
        currentPart = "";
      }
      
      const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        if ((currentPart + " " + sentence).length > maxLength) {
          if (currentPart.trim()) {
            parts.push(currentPart.trim());
            currentPart = sentence;
          } else {
            const clauseParts = sentence.split(/,\s+|(?:\s+(?:e|mas|porém|contudo|então|assim|portanto)\s+)/);
            
            if (clauseParts.length > 1) {
              let clausePart = "";
              for (const clause of clauseParts) {
                if ((clausePart + clause).length > maxLength) {
                  if (clausePart.trim()) {
                    parts.push(clausePart.trim());
                    clausePart = clause;
                  } else {
                    parts.push(clause.trim());
                  }
                } else {
                  clausePart += (clausePart ? " " : "") + clause;
                }
              }
              if (clausePart.trim()) {
                currentPart = clausePart;
              }
            } else {
              const words = sentence.split(' ');
              let wordPart = "";
              
              for (const word of words) {
                if ((wordPart + " " + word).length > maxLength) {
                  if (wordPart.trim()) {
                    parts.push(wordPart.trim());
                    wordPart = word;
                  } else {
                    parts.push(word);
                  }
                } else {
                  wordPart += (wordPart ? " " : "") + word;
                }
              }
              
              if (wordPart.trim()) {
                currentPart = wordPart;
              }
            }
          }
        } else {
          currentPart += (currentPart ? " " : "") + sentence;
        }
      }
    } else {
      const separator = currentPart.includes('\n\n') ? '\n\n' : (currentPart ? ' ' : '');
      if ((currentPart + separator + paragraph).length > maxLength) {
        if (currentPart.trim()) {
          parts.push(currentPart.trim());
          currentPart = paragraph;
        }
      } else {
        currentPart += separator + paragraph;
      }
    }
  }
  
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }
  
  const finalParts: string[] = [];
  for (const part of parts) {
    if (part.length > maxLength * 1.5) {
      const subParts = splitMessageIntoParts(part, maxLength * 0.8);
      finalParts.push(...subParts);
    } else {
      finalParts.push(part);
    }
  }
  
  return finalParts.filter(part => part.length > 0);
}

// Função para enviar mensagem dividida em partes com delay
async function sendMessageInParts(
  to: string, 
  message: string, 
  delayBetweenParts: number = 1500,
  maxPartLength: number = 800,
  showTypingIndicator: boolean = true
): Promise<void> {
  try {
    const parts = splitMessageIntoParts(message, maxPartLength);
    
    if (parts.length === 1) {
      await sendWhatsAppMessage(to, message);
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      let messageToSend = part;
      if (i < parts.length - 1 && showTypingIndicator) {
        if (!part.endsWith('.') && !part.endsWith('!') && !part.endsWith('?')) {
          messageToSend += "...";
        }
      }
      
      await sendWhatsAppMessage(to, messageToSend);
      
      if (i < parts.length - 1) {
        const nextPartLength = parts[i + 1].length;
        const dynamicDelay = Math.min(
          delayBetweenParts + (nextPartLength * 3),
          3000
        );
        await new Promise(resolve => setTimeout(resolve, dynamicDelay));
      }
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem em partes:', error);
    throw error;
  }
}

// Função auxiliar para resposta conversacional (padrão) - otimizada para 3-4 mensagens
async function sendConversationalResponse(to: string, message: string): Promise<void> {
  await sendMessageInParts(to, message, 1200, 350, true);
}

// Função auxiliar para resposta de fallback (mais rápida) - otimizada para 3-4 mensagens
async function sendFallbackResponse(to: string, message: string): Promise<void> {
  await sendMessageInParts(to, message, 900, 300, true);
}

// Função auxiliar para resposta de erro (mensagem única)
async function sendErrorResponse(to: string, message: string): Promise<void> {
  await sendWhatsAppMessage(to, message);
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
        
      } catch (error) {
        console.error("Erro ao remover arquivo temporário:", error);
      }
    }, 60000); // Remove após 1 minuto

  } catch (error) {
    console.error("Erro ao gerar e enviar áudio:", error);
    throw error;
  }
}

async function query(data: any) {
	const response = await fetch(
		"https://af9xok91yrwl455j.us-east-1.aws.endpoints.huggingface.cloud",
		{
			headers: {
                "Accept" : "application/json",
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
			method: "POST",
			body: JSON.stringify(data),
		}
	);
	return await response.json();
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

        // Verificar conteúdo malicioso com modelo customizado
        const out = await query({ inputs: messageText });

        console.log("Resposta do modelo de classificação:", out);
        
        // Verificar se o conteúdo é malicioso (score > 70%)
        const classificationResult = Array.isArray(out) ? out[0] : out;
        const isMalicious = classificationResult?.score >= 0.7;
        
        if (isMalicious) {
          
          // Enviar mensagem padrão para conteúdo malicioso
          const maliciousMessage = "⚠️ Desculpe, mas não posso responder a esse tipo de conteúdo. Vamos manter nossa conversa focada em educação financeira e investimentos de forma respeitosa e construtiva. Como posso te ajudar com suas finanças hoje? 💰";
          
          await sendWhatsAppMessage(from, maliciousMessage);
          
          // Salvar mensagem de alerta no banco
          await saveBotMessage(from, maliciousMessage, "content-filter", false);
          
          // Pular para próxima mensagem sem processar
          continue;
        }

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
              
              await sendFallbackResponse(from, response.text);

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

            // Enviar resposta automática em partes
            await sendConversationalResponse(from, response.text);

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
            await sendErrorResponse(from, errorMessage);
            
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

// Controller para health check
export const healthCheck = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Dalio AI',
    version: '2.1.0'
  });
};