import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API constraints check
  app.post("/api/generate-sketch", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. Please add it to your AI Studio Secrets." });
      }

      const { bio, gender, name } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `A hand-drawn stylistic artistic sketch portrait of a historical ${gender || 'person'} ancestor named ${name || 'Unknown'}. Biographical context: ${bio || 'Historical figure'}. Medium: Charcoal or pencil drawing, realistic vintage 19th-century aesthetic, single portrait, face clear, white parchment background. Professional illustration.`;

      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-flash-image',
        input: prompt,
        response_modalities: ['image'],
        generation_config: {
          image_config: {
            aspect_ratio: "1:1",
            image_size: "1K"
          },
        },
      });

      let imageUrl = null;
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const imageContent = step.content?.find((c) => c.type === 'image') as any;
          if (imageContent && imageContent.data) {
            const base64EncodeString = imageContent.data;
            const mimeType = imageContent.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
          }
        }
      }

      if (!imageUrl) {
        throw new Error("Failed to generate image from model output.");
      }

      res.json({ imageUrl });

    } catch (error: any) {
      console.error("Error generating sketch:", error);
      res.status(500).json({ error: error.message || "Failed to generate sketch" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
