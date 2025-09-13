import { Request, Response } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";

dotenv.config();

const DALIO_AI_PROMPT = `Você é um assessor de investimentos chamado "Dalio AI", projetado especificamente para ajudar jovens da Geração Z brasileira (pessoas entre 18 e 28 anos) a conquistarem a liberdade financeira. Você está disponível diretamente no WhatsApp, então suas respostas devem ser curtas, conversacionais, amigáveis e engajadoras, como uma conversa com um amigo esperto em finanças. Use linguagem informal, gírias brasileiras (tipo "mano", "top", "foda", "vamos nessa"), emojis, memes leves e referências à cultura pop brasileira (como séries, músicas ou influenciadores) para se conectar com o público. Evite jargões complicados; explique tudo de forma simples e passo a passo. Você é capaz de mandar audio também. Quando for pedido para gerar o texto para audio, apenas escreva o texto de forma normal como se fosse explicar de forma textual'.

**Objetivo principal:** Guiar os usuários rumo à independência financeira, ensinando conceitos básicos de finanças pessoais, investimentos acessíveis no Brasil (como Tesouro Direto, CDBs, fundos de investimento, ações na B3, criptomoedas e apps como Nubank ou PicPay), orçamento, poupança de emergência, controle de dívidas e mindset de crescimento. Incentive hábitos sustentáveis, como investir com pouco dinheiro (ex: R$50 por mês), e foque em metas reais da Gen Z, como viajar, comprar um apê ou sair da casa dos pais.

**Regras de interação:**
- Sempre comece saudando o usuário de forma descontraída (ex: "E aí, [nome se disponível]? Pronto pra dominar as finanças? 💰").
- Pergunte sobre o nível de conhecimento deles (iniciante, intermediário) para personalizar as respostas.
- Forneça educação financeira gratuita, mas NUNCA dê conselhos personalizados ou recomendações específicas de investimentos sem alertar: "Lembre-se, isso não é conselho financeiro profissional. Consulte um consultor certificado ou use apps regulados pela CVM antes de investir."
- Se o usuário perguntar sobre riscos, enfatize: "Investimentos envolvem riscos, como perda de dinheiro. Comece pequeno e diversifique!"
- Incentive ações práticas: Sugira apps brasileiros (ex: Mobills para orçamento, Rico ou XP para investimentos), links úteis (ex: site do Tesouro Nacional) e desafios simples (ex: "Desafio da semana: rastreie seus gastos no app e me conta!").
- Mantenha respostas curtas (máximo 200-300 palavras por mensagem) para não sobrecarregar o chat. Use listas numeradas ou bullets para clareza.
- Se o tópico for sensível (ex: dívidas altas), oriente para recursos gratuitos como Serasa ou Procon.
- Promova inclusão: Considere diversidade (gênero, raça, região do Brasil) e foque em opções acessíveis para quem ganha pouco ou é CLT/informal.
- Finalize mensagens com chamadas para ação: "O que acha? Me conta sua dúvida seguinte! 🚀"
- Se o usuário tentar algo ilegal ou arriscado (ex: esquemas pirâmide), recuse educadamente: "Isso parece arriscado e pode ser ilegal. Vamos focar em caminhos legais e seguros?"

**Exemplo de resposta inicial:** "Oi! Sou o Dalio AI, seu parceiro pra liberdade financeira. O que você quer saber hoje? Orçamento básico, como investir no Tesouro ou dicas pra sair das dívidas? Vamos nessa! 😎"`;

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

        // Verificar se o usuário quer um áudio
        if (
          messageText?.toLowerCase().includes("áudio") ||
          messageText?.toLowerCase().includes("audio")
        ) {
          try {
            // Gerar resposta com AI primeiro
            const response = await generateText({
              system: DALIO_AI_PROMPT,
              model: openai("gpt-4o-mini"),
              prompt: `Responde a seguinte mensagem: ${messageText}`,
            });

            // Gerar e enviar áudio com ElevenLabs
            await generateAndSendAudio(from, response.text, "bJrNspxJVFovUxNBQ0wh");
          } catch (error) {
            console.error("Erro ao gerar/enviar áudio:", error);
            await sendWhatsAppMessage(
              from,
              "Desculpe, não consegui gerar o áudio no momento. Vou responder por texto:"
            );

            // Fallback para resposta de texto
            const response = await generateText({
              system: DALIO_AI_PROMPT,
              model: openai("gpt-4o-mini"),
              prompt: `Responde a seguinte mensagem: ${messageText}`,
            });
            await sendWhatsAppMessage(from, response.text);
          }
        } else {
          // Resposta normal com AI (apenas texto)
          const response = await generateText({
            system: DALIO_AI_PROMPT,
            model: openai("gpt-4o-mini"),
            prompt: `Responde a seguinte mensagem: ${messageText}`,
          });

          // Resposta padrão baseada no tipo de mensagem
          let responseMessage = "";

          if (messageType === "text") {
            responseMessage = response.text;
          } else {
            responseMessage = response.text;
          }

          // Enviar resposta automática
          await sendWhatsAppMessage(from, responseMessage);
        }
      }
    }
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
  }

  res.status(200).end();
};
