import { getUserLimits, reserveDailyLimit } from './subscriptions';
import { Request, Response } from 'express';
import { query } from './db';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { generateAIResponse } from './ai';
import { verifyToken } from './auth';
import { config } from './config';

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
      processVoicePipeline(messageId.toString(), audioUrl, chatId.toString(), userId.toString()).catch(err => 
        console.error('❌ [VOICE] Pipeline error:', err)
      );

  } catch (error) {
      console.error("❌ [VOICE] Upload Error:", error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

const processVoicePipeline = async (messageId: string, audioPath: string, chatId: string, userId: string) => {
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

        // Mock mode for testing without Python
        if (config.mockWhisper) {
            console.log('⚠️ [MOCK] Using mock transcription (MOCK_WHISPER=true)');
            const mockText = "Mock transcription text for testing";
            await query(
                `UPDATE messages SET text = $1, status = 'ready' WHERE id = $2`, 
                [mockText, messageId]
            );
            
            // Continue with AI response...
            const aiResult = await generateAIResponse(mockText, { conversationHistory: [] });
            await query(
                `INSERT INTO messages (chat_id, user_id, role, type, text, status)
                 VALUES ($1, $2, 'assistant', 'text', $3, 'ready')`,
                [chatId, userId, aiResult.response]
            );
            return;
        }

        const transcribedText = await new Promise<string>((resolve, reject) => {
             const command = `"${pythonPath}" "${scriptPath}" "${absAudioPath}" ru`;
             console.log(`🔄 [PIPELINE] Running command: ${command}`);
             
             exec(command, { 
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

        // Get ONLY messages from THIS chat (not from other chats)
        // Limit to last 10 messages to avoid context pollution
        const historyRes = await query(
            `SELECT role, text FROM messages 
             WHERE chat_id = $1 
             AND user_id = $2 
             AND status = 'ready' 
             AND id != $3
             AND text IS NOT NULL
             AND text != ''
             ORDER BY created_at DESC
             LIMIT 10`,
            [chatId, userId, messageId]
        );
        
        // Reverse to get chronological order (oldest first)
        const history = historyRes.rows.reverse().map((row: any) => ({
            role: row.role as 'user' | 'assistant',
            content: row.text || "" 
        }));
        
        console.log(`🤖 [PIPELINE] Generating AI response with ${history.length} messages in history from chat ${chatId}`);
        console.log(`📜 [PIPELINE] History preview:`, history.slice(0, 2).map(m => `${m.role}: ${m.content.substring(0, 50)}...`));

        const aiResult = await generateAIResponse(transcribedText, {
            conversationHistory: history,
        });
        
        console.log(`✅ [PIPELINE] AI response generated: "${aiResult.response.substring(0, 100)}..."`);

        await query(
            `INSERT INTO messages (chat_id, user_id, role, type, text, status)
             VALUES ($1, $2, 'assistant', 'text', $3, 'ready')`,
            [chatId, userId, aiResult.response]
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
