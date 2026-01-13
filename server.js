import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

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

    // Appel direct à l'API ElevenLabs pour déclencher un appel via agent
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID}`;
    
    const payload = {
      twilio_config: {
        account_sid: process.env.TWILIO_ACCOUNT_SID,
        auth_token: process.env.TWILIO_AUTH_TOKEN,
        from_number: from_number,
        to_number: to_number
      }
    };

    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] ElevenLabs API Error:`, result);
      return res.status(response.status).json({
        error: 'ElevenLabs API error',
        details: result
      });
    }

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
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ElevenLabs Bridge running on port ${PORT}`);
  console.log(`📞 Ready to register calls for agent ${process.env.ELEVENLABS_AGENT_ID}`);
});
