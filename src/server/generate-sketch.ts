/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

export interface SketchRequest {
  bio?: string;
  gender?: string;
  name?: string;
}

export async function generateSketch(
  apiKey: string,
  { bio, gender, name }: SketchRequest
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `A hand-drawn stylistic artistic sketch portrait of a historical ${gender || 'person'} ancestor named ${name || 'Unknown'}. Biographical context: ${bio || 'Historical figure'}. Medium: Charcoal or pencil drawing, realistic vintage 19th-century aesthetic, single portrait, face clear, white parchment background. Professional illustration.`;

  const interaction = await ai.interactions.create({
    model: 'gemini-3.1-flash-image',
    input: prompt,
    response_modalities: ['image'],
    generation_config: {
      image_config: {
        aspect_ratio: '1:1',
        image_size: '1K',
      },
    },
  });

  for (const step of interaction.steps) {
    if (step.type === 'model_output') {
      const imageContent = step.content?.find((c) => c.type === 'image') as
        | { data?: string; mime_type?: string }
        | undefined;
      if (imageContent?.data) {
        const mimeType = imageContent.mime_type || 'image/png';
        return `data:${mimeType};base64,${imageContent.data}`;
      }
    }
  }

  throw new Error('Failed to generate image from model output.');
}
