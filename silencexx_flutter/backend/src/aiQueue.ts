import Queue from 'bull';
import { generateAIResponse } from './ai';
import { query } from './db';

// Create AI request queue with concurrency
export const aiQueue = new Queue('ai-requests', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

// Process up to 5 concurrent AI requests
aiQueue.process('generate', 5, async (job) => {
  try {
    const { prompt, context, userId, chatId } = job.data;
    
    // Generate AI response
    const response = await generateAIResponse(prompt, context);
    
    // Store response in database
    if (chatId) {
      await query(
        `INSERT INTO user_chat (chat_id, user_id, message, type, is_ai_response)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [chatId, userId, response, 'text', true]
      );
    }
    
    return {
      success: true,
      response,
      processedAt: new Date(),
    };
  } catch (error) {
    console.error('Error processing AI queue job:', error);
    throw error;
  }
});

// Handle failed jobs
aiQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

// Handle completed jobs
aiQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result.response?.substring(0, 50));
});

// Queue an AI request with priority
export async function queueAIRequest(
  prompt: string,
  context: any,
  userId: string,
  chatId: string,
  priority: number = 0
) {
  try {
    const job = await aiQueue.add(
      'generate',
      { prompt, context, userId, chatId },
      {
        priority: priority, // Higher number = higher priority
        jobId: `${chatId}-${Date.now()}`, // Unique job ID
      }
    );
    
    return {
      jobId: job.id,
      queued: true,
    };
  } catch (error) {
    console.error('Error queueing AI request:', error);
    throw error;
  }
}

// Get job status
export async function getJobStatus(jobId: string) {
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return null;
  }
}

// Get queue statistics
export async function getQueueStats() {
  try {
    const waiting = await aiQueue.getWaitingCount();
    const active = await aiQueue.getActiveCount();
    const completed = await aiQueue.getCompletedCount();
    const failed = await aiQueue.getFailedCount();
    
    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}

// Clean up old jobs
export async function cleanupQueue() {
  try {
    await aiQueue.clean(3600000, 'completed'); // Clean completed jobs older than 1 hour
    await aiQueue.clean(86400000, 'failed'); // Clean failed jobs older than 24 hours
    console.log('Queue cleanup completed');
  } catch (error) {
    console.error('Error cleaning up queue:', error);
  }
}

// Initialize Redis connection
export function initializeQueue() {
  console.log('AI Queue initialized with 5 concurrent processors');
  
  // Cleanup old jobs every hour
  setInterval(() => {
    cleanupQueue();
  }, 3600000);
}
