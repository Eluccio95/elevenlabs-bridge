import express from 'express';
import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint principal
app.post('/register-call', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.SECRET_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from_number, to_number, sav_id } = req.body;

    if (!from_number || !to_number) {
      return res.status(400).json({ 
        error: 'Missing required fields: from_number, to_number' 
      });
    }

    console.log(`[${new Date().toISOString()}] Registering call from ${from_number} to ${to_number} (SAV #${sav_id})`);

    // Utilisation correcte de l'API ElevenLabs Conversational AI
    const result = await elevenlabs.conversationalAi.registerConversation({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      conversation_config_override: {
        twilio: {
          account_sid: process.env.TWILIO_ACCOUNT_SID,
          auth_token: process.env.TWILIO_AUTH_TOKEN,
          from_number: from_number,
          to_number: to_number
        }
      },
      metadata: {
        sav_id: sav_id?.toString() || 'unknown'
      }
    });

    console.log(`[${new Date().toISOString()}] Call registered successfully:`, result);

    res.json({
      success: true,
      conversation_id: result.conversation_id || 'unknown',
      result: result
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.status(500).json({
      error: 'Failed to register call',
      message: error.message,
      details: error.response?.data || error.toString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ElevenLabs Bridge running on port ${PORT}`);
  console.log(`📞 Ready to register calls for agent ${process.env.ELEVENLABS_AGENT_ID}`);
});
