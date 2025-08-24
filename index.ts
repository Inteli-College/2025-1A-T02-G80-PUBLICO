import express from "express";
import dotenv from "dotenv";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();

// Middleware para parsing JSON
app.use(express.json());

const verifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN ||
  "EAAZAvODerUqYBPfrmk7AqJTelJnB7MfqHcaDC8spadYwJ4a7R2JT4e06i5jAXrcVIx0ZBGa0cjwXCoNaVAigGwzpFTp7lweLYnsj2R7zoZBoP9PKItbC3P0rsuPiZCEgjEZCjNNLWJIMTueNZCUIj3ZC3Lw23EdR7QAm1CNHs7fboPeRFe4toFh4w9oPPwXgQR6xk9provpNZBLoXsELKfiQfZCwTNMxA8DZBnZC0HRz57YiQZDZD";

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || verifyToken;
const phoneNumberId = "766776193182186";
const port = process.env.PORT || 3001;

// Configuração do ElevenLabs
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Voice ID padrão (você pode alterar para outras vozes)
const defaultVoiceId = "JBFqnCBsd6RMkjVDRZzb"; // George voice

// Função para enviar mensagem via WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, message: string) {
  console.log(`entrei aqui`);
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
      // Usar mídia já enviada para o WhatsApp (recomendado)
      audioPayload.id = audioId;
    } else if (audioUrl) {
      // Usar URL externa (não recomendado para produção)
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

// Função auxiliar para verificar se um arquivo de áudio é válido
function isValidAudioFile(filePath: string, mimeType: string): boolean {
  const validMimeTypes = [
    "audio/aac",
    "audio/mp4",
    "audio/mpeg",
    "audio/amr",
    "audio/ogg",
  ];

  const validExtensions = [".aac", ".mp4", ".mp3", ".amr", ".ogg"];
  const fileExtension = path.extname(filePath).toLowerCase();

  return (
    validMimeTypes.includes(mimeType) && validExtensions.includes(fileExtension)
  );
}

// Função para gerar áudio com ElevenLabs e salvar como arquivo
async function generateAudioWithElevenLabs(
  text: string,
  voiceId: string = defaultVoiceId
): Promise<string> {
  try {
    console.log(`Gerando áudio com ElevenLabs: "${text}"`);

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
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

    // 4. Limpar arquivo temporário (opcional)
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

/* 
EXEMPLOS DE USO DAS FUNÇÕES DE ÁUDIO:

=== FUNÇÕES BÁSICAS ===

1. Enviar áudio usando URL externa (não recomendado para produção):
await sendWhatsAppAudio("5511999999999", undefined, "https://example.com/audio.mp3");

2. Fazer upload de arquivo local e depois enviar (recomendado):
const mediaId = await uploadMediaToWhatsApp("./audio/message.mp3", "audio/mpeg");
await sendWhatsAppAudio("5511999999999", mediaId);

3. Fazer upload de URL e depois enviar:
const mediaId = await uploadMediaToWhatsApp("https://example.com/audio.mp3", "audio/mpeg");
await sendWhatsAppAudio("5511999999999", mediaId);

4. Enviar áudio usando media_id já existente:
await sendWhatsAppAudio("5511999999999", "existing_media_id_123");

5. Validar arquivo antes de enviar:
if (isValidAudioFile("./audio/message.mp3", "audio/mpeg")) {
  const mediaId = await uploadMediaToWhatsApp("./audio/message.mp3", "audio/mpeg");
  await sendWhatsAppAudio("5511999999999", mediaId);
}

=== FUNÇÕES COM ELEVENLABS (NOVO!) ===

6. Gerar áudio com ElevenLabs e salvar:
const audioPath = await generateAudioWithElevenLabs("Olá! Como você está?");

7. Gerar áudio com voz específica:
const audioPath = await generateAudioWithElevenLabs("Hello!", "voice_id_aqui");

8. Gerar e enviar áudio diretamente (RECOMENDADO):
await generateAndSendAudio("5511999999999", "Sua mensagem aqui");

9. Gerar e enviar com voz específica:
await generateAndSendAudio("5511999999999", "Sua mensagem", "voice_id_aqui");

=== INTEGRAÇÃO NO WEBHOOK ===
O bot agora detecta automaticamente quando alguém menciona "áudio" ou "audio" 
e responde com áudio gerado pelo ElevenLabs + transcrição em texto.

Formatos de áudio suportados:
- audio/aac (.aac)
- audio/mp4 (.mp4) 
- audio/mpeg (.mp3) ← Usado pelo ElevenLabs
- audio/amr (.amr)
- audio/ogg (.ogg - apenas codec OPUS)

Limitações:
- Tamanho máximo: 16MB
- Duração máxima: Não especificada pela API
- Para arquivos .ogg, apenas codec OPUS é suportado
- ElevenLabs: Requer API key válida

Dicas:
- Use sempre upload de mídia em produção
- URLs externas podem falhar se não estiverem acessíveis
- Media IDs têm validade limitada (normalmente 30 dias)
- Arquivos temporários são removidos automaticamente após 1 minuto
- Configure ELEVENLABS_API_KEY no .env para usar text-to-speech
*/

// Route for GET requests (verificação do webhook)
app.get("/", (req, res) => {
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
});

// Route for POST requests (recebimento de mensagens)
app.post("/", async (req, res) => {
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
              model: openai("gpt-4o-mini"),
              prompt: `Responde a seguinte mensagem de forma amigável e conversacional: ${messageText}`,
            });

            // Gerar e enviar áudio com ElevenLabs
            await generateAndSendAudio(from, response.text, "bJrNspxJVFovUxNBQ0wh");

            // Enviar também a mensagem de texto como backup
            await sendWhatsAppMessage(
              from,
              `🎵 Áudio gerado! Aqui está a transcrição:\n\n${response.text}`
            );
          } catch (error) {
            console.error("Erro ao gerar/enviar áudio:", error);
            await sendWhatsAppMessage(
              from,
              "Desculpe, não consegui gerar o áudio no momento. Vou responder por texto:"
            );

            // Fallback para resposta de texto
            const response = await generateText({
              model: openai("gpt-4o-mini"),
              prompt: `Responde a seguinte mensagem: ${messageText}`,
            });
            await sendWhatsAppMessage(from, response.text);
          }
        } else {
          // Resposta normal com AI (apenas texto)
          const response = await generateText({
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
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
