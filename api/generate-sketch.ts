/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSketch } from '../src/server/generate-sketch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { bio, gender, name } = req.body ?? {};
    const imageUrl = await generateSketch(apiKey, { bio, gender, name });
    return res.json({ imageUrl });
  } catch (error: unknown) {
    console.error('Error generating sketch:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate sketch';
    return res.status(500).json({ error: message });
  }
}
