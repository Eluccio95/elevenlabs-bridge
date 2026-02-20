import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint principal - Appel sortant via ElevenLabs
app.post('/register-call', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.SECRET_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

  const { to_number, sav_id, dynamic_variables } = req.body;
    
    if (!to_number) {
      return res.status(400).json({ 
        error: 'Missing required field: to_number' 
      });
    }

    // Appel à l'API ElevenLabs pour déclencher un appel sortant
    const elevenLabsUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
    
const payload = {
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: to_number
};
if (dynamic_variables) {
      payload.conversation_initiation_client_data = {
          dynamic_variables: dynamic_variables
      };
}

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

    console.log(`[${new Date().toISOString()}] Outbound call initiated successfully:`, result);

    res.json({
      success: true,
      call_sid: result.callSid || 'unknown',
      conversation_id: result.conversation_id || 'unknown',
      result: result
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.status(500).json({
      error: 'Failed to initiate call',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ElevenLabs Bridge running on port ${PORT}`);
  console.log(`📞 Ready to make outbound calls with agent ${process.env.ELEVENLABS_AGENT_ID}`);
});
