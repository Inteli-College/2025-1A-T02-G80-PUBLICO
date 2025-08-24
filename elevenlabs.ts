import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';
import 'dotenv/config';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});
const audio = await elevenlabs.textToSpeech.convert('1eBtZhneFpMPiYsjVTGl', {
  text: 'Um fundo imobiliário é um tipo de investimento que envolve a compra de imóveis com o objetivo de gerar renda passiva. Ele pode ser uma opção de investimento segura e rentável, mas requer um bom planejamento e gestão para garantir resultados positivos.',
  modelId: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
});

await play(audio);
