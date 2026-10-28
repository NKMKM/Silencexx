import { readConversation } from './conversation';
import { getUserLimits, reserveDailyLimit } from './subscriptions';
import { Request, Response } from 'express';
import { query } from './db';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { classifyVoiceEmotion } from './voiceEmotion';
import { generateAIResponse } from './ai';
import { verifyToken } from './auth';
import { config } from './config';

let emotionSchema: Promise<unknown> | undefined;
function ensureEmotionSchema() {
  if (!emotionSchema) emotionSchema = query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_emotion VARCHAR(16)')
    .catch(error => { emotionSchema = undefined; throw error; });
  return emotionSchema;
}

// Controller for POST /api/messages/voice
export const handleVoiceUpload = async (req: Request, res: Response) => {
  try {
      console.log('🎤 [VOICE] Received voice upload request');
      console.log('🎤 [VOICE] File:', req.file);

      if (!req.file) {
          console.log('❌ [VOICE] No audio file provided');
          return res.status(400).json({ error: 'No audio file provided' });
      }

      const { chatId } = req.body;
      const language: 'ru' | 'en' = req.body.language === 'en' ? 'en' : 'ru';

      // Extract userId from token
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId: number | undefined;
      if (token) {
          try {
              const decoded = verifyToken(token);
              userId = decoded.userId;
          } catch (e) {
              console.log('❌ [VOICE] Invalid token');
          }
      }

      console.log(`🎤 [VOICE] ChatId: ${chatId}, UserId: ${userId}`);

      if (!chatId || !userId) {
           console.log('❌ [VOICE] Missing chatId or userId');
           return res.status(400).json({ error: 'ChatId and UserId required' });
      }

      const owner = await query('SELECT id FROM chat_id WHERE id=$1 AND user_id=$2', [chatId, userId]);
      if (!owner.rows.length) {
          await fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(403).json({ error: 'Access denied' });
      }
      await ensureEmotionSchema();
      const limits = await getUserLimits(userId);
      if (!limits || !await reserveDailyLimit(userId, 'voice_messages', limits.dailyVoiceLimit)) {
          await fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(429).json({ error: 'Daily voice limit reached' });
      }
      const audioUrl = req.file.path;

      // Check if file exists
      if (!fs.existsSync(audioUrl)) {
          console.log('❌ [VOICE] File not found at:', audioUrl);
          return res.status(400).json({ error: 'Audio file not saved properly' });
      }

      const fileStats = fs.statSync(audioUrl);
      console.log(`🎤 [VOICE] File saved: ${audioUrl} (${fileStats.size} bytes)`);

      const insertRes = await query(
          `INSERT INTO messages (chat_id, user_id, role, type, audio_url, status)
           VALUES ($1, $2, 'user', 'voice', $3, 'uploaded')
           RETURNING id`,
          [chatId, userId, audioUrl]
      );

      const messageId = insertRes.rows[0].id;
      console.log(`✅ [VOICE] Message created with ID: ${messageId}`);

      res.json({ messageId, status: 'uploaded', audioUrl });

      // Запускаем обработку асинхронно
      console.log(`🎤 [VOICE] Starting async pipeline for message ${messageId}`);
      processVoicePipeline(messageId.toString(), audioUrl, chatId.toString(), userId.toString(), language).catch(err =>
        console.error('❌ [VOICE] Pipeline error:', err)
      );

  } catch (error) {
      console.error("❌ [VOICE] Upload Error:", error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

const processVoicePipeline = async (messageId: string, audioPath: string, chatId: string, userId: string, language: 'ru' | 'en') => {
    try {
        console.log(`\n🔄 [PIPELINE] =======================================`);
        console.log(`🔄 [PIPELINE] Starting voice processing for message ${messageId}`);
        console.log(`🔄 [PIPELINE] Audio path: ${audioPath}`);

        await query(`UPDATE messages SET status = 'transcribing' WHERE id = $1`, [messageId]);
        console.log(`🔄 [PIPELINE] Status updated to 'transcribing'`);

        // Use faster-whisper script (PyTorch 2.8 compatible)
        const scriptPath = path.join(__dirname, '../scripts/transcribe-v2.py');
        const absAudioPath = path.resolve(audioPath);

        console.log(`🔄 [PIPELINE] Script path: ${scriptPath}`);
        console.log(`🔄 [PIPELINE] Absolute audio path: ${absAudioPath}`);
        console.log(`🔄 [PIPELINE] Using faster-whisper (PyTorch 2.8+ compatible)`);

        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            console.error(`❌ [PIPELINE] Script not found: ${scriptPath}`);
            throw new Error('Transcription script not found');
        }

        // Check if audio file exists
        if (!fs.existsSync(absAudioPath)) {
            console.error(`❌ [PIPELINE] Audio file not found: ${absAudioPath}`);
            throw new Error('Audio file not found');
        }

        // Check Python executable
        const pythonPath = config.pythonExecutable;
        if ((path.isAbsolute(pythonPath) || pythonPath.includes(path.sep)) && !fs.existsSync(pythonPath)) {
            console.error(`❌ [PIPELINE] Python not found at: ${pythonPath}`);
            console.error(`❌ Run 'setup-python-env.bat' in backend folder to create virtual environment`);
            throw new Error('Python executable not found. Run setup-python-env.bat first.');
        }

        console.log(`🐍 [PIPELINE] Using Python: ${pythonPath}`);

        const transcribedText = config.mockWhisper ? "Mock transcription text for testing" : await new Promise<string>((resolve, reject) => {
             execFile(pythonPath, [scriptPath, absAudioPath, language], {
                 timeout: config.transcriptionTimeout,
                 maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
                 env: {
                     ...process.env,
                     PYTHONIOENCODING: 'utf-8',  // Force UTF-8 for Russian text on Windows
                 }
             }, (err, stdout, stderr) => {
                 if (stderr) {
                     console.log(`🔄 [PIPELINE] Python stderr:`, stderr);
                 }

                 // Handle execution errors
                 if (err) {
                     // Check for common error patterns
                     const errorMsg = stderr || err.message || 'Unknown error';

                     if (errorMsg.includes('No module named')) {
                         const moduleName = errorMsg.match(/No module named '(\w+)'/)?.[1] || 'unknown';
                         console.error(`❌ [PIPELINE] Missing Python module: ${moduleName}`);
                         console.error(`❌ Solution: Run 'setup-python-env.bat' in backend folder`);
                         reject(new Error(`Python module '${moduleName}' not found. Run setup-python-env.bat to install dependencies.`));
                         return;
                     }

                     if (errorMsg.includes('CUDA') || errorMsg.includes('GPU')) {
                         console.error(`❌ [PIPELINE] GPU/CUDA error - using CPU fallback`);
                         // Continue execution, WhisperX should fallback to CPU
                     }

                     if (!stdout) {
                         console.error("❌ [PIPELINE] Python script failed:", errorMsg);
                         reject(new Error(`Transcription failed: ${errorMsg.substring(0, 200)}`));
                         return;
                     }
                 }

                 try {
                     // Extract JSON from stdout (in case there's extra output)
                     let jsonStr = stdout.trim();
                     const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
                     if (jsonMatch) {
                         jsonStr = jsonMatch[0];
                     }

                     const json = JSON.parse(jsonStr);
                     if (json.error) {
                         console.error("❌ [PIPELINE] WhisperX returned error:", json.error);
                         reject(new Error(json.error));
                     } else {
                         console.log(`✅ [PIPELINE] WhisperX success! Language: ${json.language}`);
                         resolve(json.text || "");
                     }
                 } catch (e) {
                     reject(e);
                 }
             });
        });


        await query(
            `UPDATE messages SET text = $1, status = 'ready' WHERE id = $2`,
            [transcribedText, messageId]
        );
        console.log(`✅ [PIPELINE] Message ${messageId} updated with transcription`);

        const history = (await readConversation(Number(chatId), Number(userId)))
          .filter(row => row.id !== `messages:${messageId}` && row.status === 'ready' && row.text)
          .slice(-12)
          .map(row => ({ role: row.role as 'user' | 'assistant', content: row.text }));

        const [aiResult, emotion] = await Promise.all([
          generateAIResponse(transcribedText, { conversationHistory: history, language }),
          classifyVoiceEmotion(transcribedText).then(async emotion => {
            await query('UPDATE messages SET voice_emotion=$1 WHERE id=$2 AND user_id=$3', [emotion, messageId, userId]);
            return emotion;
          }),
        ]);

        console.log('Voice response and decorative emotion ready');

        await query(
            `INSERT INTO messages (chat_id, user_id, role, type, text, status, voice_emotion)
             VALUES ($1, $2, 'assistant', 'text', $3, 'ready', $4)`,
            [chatId, userId, aiResult.response, emotion]
        );

        console.log(`✅ [PIPELINE] AI response saved to database`);
        console.log(`🔄 [PIPELINE] =======================================\n`);

    } catch (err) {
        console.error("❌ [PIPELINE] Voice Pipeline Failed:", err);
        await query(`UPDATE messages SET status = 'error' WHERE id = $1`, [messageId]);
    }
};

export const processVoiceMessage = handleVoiceUpload;
export const transcribeAudio = async (req: Request, res: Response) => { res.status(501).json({error: "Deprecated"}); };
export const synthesizeSpeech = async (req: Request, res: Response) => { res.status(501).json({error: "Not implemented"}); };
export const getSupportedLanguages = async (req: Request, res: Response) => { res.json({ languages: ['ru', 'en'] }); };
