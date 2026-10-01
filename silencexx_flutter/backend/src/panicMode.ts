import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';
import { generateAIResponse } from './ai';
import crypto from 'crypto';

/**
 * Panic Mode Feature - Emergency anxiety management
 * Provides step-by-step guidance for users experiencing panic/anxiety
 */

const PANIC_MODE_PROMPTS = {
  initial: `You are a compassionate anxiety support AI. A user is experiencing panic/anxiety right now.

IMPORTANT:
- Keep your response VERY SHORT (2-3 sentences max)
- Use warm, simple language
- Be direct and grounding
- Remember: You are not a doctor, but you're here to help them through this moment

Say something like:
"I'm with you. What you're feeling is panic/anxiety - it's unpleasant but your body is safe. Let's get through this together, one step at a time."

Then offer them a choice about how to continue (voice or text).`,

  breathing: `Guide a simple breathing exercise. Use this exact format:
"Let's breathe together. Follow along:
- Breathe IN for 4 seconds... (pause 4 seconds)
- Hold... (pause 2 seconds)
- Breathe OUT for 6 seconds... (pause 6 seconds)

That's one cycle. We'll do 10 more together."

Keep it simple, encouraging, and soothing.`,

  grounding_intro: `Now we'll do grounding. This connects you to the present moment.

Say: "I'm going to ask you 5 things. Answer as best you can - no right or wrong answers. This brings you back to now.

What are 5 things you can SEE right now? (You can list them one word each, or tell me)"

Be warm and encouraging.`,

  grounding_step: (stepNumber: number, stepName: string) => {
    const steps = [
      '5 things you can SEE',
      '4 things you can TOUCH',
      '3 things you can HEAR',
      '2 things you can SMELL or TASTE',
      '1 thing you\'re grateful for / feeling safe about',
    ];

    return `Guide the user through step ${stepNumber} of the 5-4-3-2-1 grounding exercise.

Current step: ${stepName}

After they respond:
1. Validate their answer briefly ("That's great", "Good observation")
2. If ${stepNumber} < 5, ask the NEXT step
3. If ${stepNumber} === 5, say something like: "You did it. You're here, you're safe. That took courage."`;
  },

  anxiety_talk: `The user has shared their scary thought.

Respond with:
1. Acknowledge it warmly: "I hear that you're afraid of ___. That makes sense."
2. Normalize: "Panic often makes scary thoughts feel more real than they are. But right now, you're safe."
3. Gentle reframe: "What's one small thing that could help you feel slightly safer TODAY?"

Keep it short (3-4 sentences), compassionate, never dismissive.`,

  closing: (startLevel: number, endLevel: number) => {
    if (endLevel <= 3) {
      return `The user has made progress. Say something warm and celebrating:
"You got through that. I'm proud of you. Your body is already calming down - notice that breathing is easier.

Remember: You've survived every panic before. This one will pass too.

If you need to talk more, I'm here."`;
    } else if (endLevel <= 6) {
      return `The user still feels anxious. Offer options:
"You're making progress even if it doesn't feel like it yet. Would you like to:
1. Do the breathing again
2. Try grounding one more time
3. Just talk about what's worrying you"`;
    } else {
      return `The user is still in acute distress. Be direct and compassionate:
"I can see you're still really struggling. That's okay - sometimes we need more support.

Please consider:
- Calling a trusted person (friend, family)
- Contacting a professional (psychologist, helpline)
- In emergency, call 112 or your local crisis number

I'm here to help, but I have limits. Professional help is trained for this. You don't have to do this alone."`;
    }
  },
};

export async function startPanicMode(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token not provided' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const sessionId = `panic_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create panic session
    const result = await query(
      `
      INSERT INTO panic_sessions (user_id, session_id, status)
      VALUES ($1, $2, $3)
      RETURNING id, session_id, created_at
      `,
      [userId, sessionId, 'active']
    );

    const panicSessionId = result.rows[0].id;
    const dbSessionId = result.rows[0].session_id;

    // Generate initial AI response
    let initialResponse = '';
    try {
      const aiResponse = await generateAIResponse(PANIC_MODE_PROMPTS.initial, {});
      initialResponse = aiResponse.response;
    } catch (aiErr) {
      console.warn('AI response failed, using default:', aiErr);
      initialResponse =
        "I'm with you. What you're feeling is panic - it's unpleasant but your body is safe. Let's get through this together, step by step.";
    }

    console.log(`🆘 Panic mode started for user ${userId}: ${dbSessionId}`);

    res.json({
      success: true,
      panicSessionId,
      sessionId: dbSessionId,
      initialMessage: initialResponse,
      nextStep: 'anxiety_level_check',
    });
  } catch (error) {
    console.error('❌ Error starting panic mode:', error);
    res.status(500).json({ success: false, error: 'Failed to start panic mode' });
  }
}

export async function recordAnxietyLevel(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token not provided' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { sessionId, level, isStart } = req.body;

    if (!sessionId || level === undefined) {
      return res.status(400).json({ success: false, error: 'Missing sessionId or level' });
    }

    const column = isStart ? 'anxiety_level_start' : 'anxiety_level_end';

    await query(
      `
      UPDATE panic_sessions
      SET ${column} = $1, updated_at = NOW()
      WHERE session_id = $2 AND user_id = $3
      `,
      [level, sessionId, userId]
    );

    console.log(`📊 Recorded anxiety level ${level} for session ${sessionId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error recording anxiety level:', error);
    res.status(500).json({ success: false, error: 'Failed to record anxiety level' });
  }
}

export async function processPanicStep(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token not provided' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { sessionId, stepType, userInput, groundingIndex } = req.body;

    if (!sessionId || !stepType) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or stepType',
      });
    }

    // Get current session
    const sessionResult = await query(
      `SELECT id, completed_steps FROM panic_sessions WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const panicSessionId = sessionResult.rows[0].id;
    const completedSteps = sessionResult.rows[0].completed_steps;

    // Generate AI response for this step
    let aiResponse = '';
    const prompt = PANIC_MODE_PROMPTS[stepType as keyof typeof PANIC_MODE_PROMPTS];

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Unknown step type' });
    }

    try {
      let promptText: string;
      
      if (typeof prompt === 'function') {
        if (stepType === 'closing') {
          // For closing, we need endLevel - use completedSteps as an estimate
          promptText = (prompt as any)(2, completedSteps);
        } else if (stepType === 'grounding_step') {
          // Map step number to grounding step name
          const groundingSteps = [
            '5 things you can SEE',
            '4 things you can TOUCH',
            '3 things you can HEAR',
            '2 things you can SMELL or TASTE',
            "1 thing you're grateful for / feeling safe about"
          ];
          const stepIndex = Number.isInteger(groundingIndex) && groundingIndex >= 0 && groundingIndex < 5
            ? groundingIndex : completedSteps % 5;
          promptText = (prompt as any)(stepIndex + 1, groundingSteps[stepIndex]);
        } else {
          // Unknown function type - try calling with completedSteps
          promptText = (prompt as any)(completedSteps);
        }
      } else {
        promptText = prompt as string;
      }
      
      if (typeof userInput === 'string' && userInput.trim()) {
        promptText += `\n\nUser response: ${userInput.trim()}`;
      }
      const ai = await generateAIResponse(promptText, {});
      aiResponse = ai.response;
    } catch (aiErr) {
      console.warn('AI response failed:', aiErr);
      aiResponse = "I understand. Let's continue.";
    }

    // Record this step
    await query(
      `
      INSERT INTO panic_session_responses 
      (panic_session_id, step_number, step_type, user_input, ai_response)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [panicSessionId, completedSteps + 1, stepType, userInput || '', aiResponse]
    );

    // Update completed steps
    await query(
      `
      UPDATE panic_sessions
      SET completed_steps = completed_steps + 1, updated_at = NOW()
      WHERE id = $1
      `,
      [panicSessionId]
    );

    console.log(`✅ Step ${stepType} completed for session ${sessionId}`);

    res.json({
      success: true,
      aiResponse,
      nextStep: getNextStep(stepType),
      stepCompleted: completedSteps + 1,
    });
  } catch (error) {
    console.error('❌ Error processing panic step:', error);
    res.status(500).json({ success: false, error: 'Failed to process step' });
  }
}

export async function completePanicMode(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token not provided' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { sessionId, endAnxietyLevel } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing sessionId' });
    }

    await query(
      `
      UPDATE panic_sessions
      SET status = $1, anxiety_level_end = $2, completed_at = NOW(), updated_at = NOW()
      WHERE session_id = $3 AND user_id = $4
      `,
      ['completed', endAnxietyLevel || null, sessionId, userId]
    );

    console.log(`🎯 Panic mode completed for session ${sessionId}`);

    res.json({ success: true, message: 'Panic mode session completed' });
  } catch (error) {
    console.error('❌ Error completing panic mode:', error);
    res.status(500).json({ success: false, error: 'Failed to complete panic mode' });
  }
}

export async function getPanicHistory(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token not provided' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const result = await query(
      `
      SELECT 
        id,
        session_id,
        status,
        anxiety_level_start,
        anxiety_level_end,
        scary_thought,
        completed_steps,
        created_at,
        completed_at
      FROM panic_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    res.json({
      success: true,
      sessions: result.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching panic history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch panic history' });
  }
}

function getNextStep(currentStep: string): string {
  const steps = [
    'breathing',
    'breathing', // repeat breathing
    'grounding_intro',
    'grounding_step_1', // 5 things you see
    'grounding_step_2', // 4 things you touch
    'grounding_step_3', // 3 things you hear
    'grounding_step_4', // 2 things smell/taste
    'grounding_step_5', // 1 thing grateful
    'anxiety_talk',
    'closing',
  ];

  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return 'closing';
  }

  return steps[currentIndex + 1];
}
