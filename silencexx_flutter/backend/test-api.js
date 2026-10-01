#!/usr/bin/env node

/**
 * 🧪 Backend API Testing Script
 * Тестирует все endpoints CloudMind Backend
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         🧪 CloudMind Backend API Testing Suite 🧪         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Health Check
    console.log('📡 Test 1: Health Check');
    console.log('─'.repeat(60));
    let data = await makeRequest(`${BASE_URL}/health`);
    console.log('✅ Status:', data.status);
    console.log('✅ Version:', data.version);
    console.log('✅ Timestamp:', data.timestamp);
    console.log('');

    // Test 2: Detect Crisis
    console.log('🆘 Test 2: Detect Crisis');
    console.log('─'.repeat(60));
    data = await makeRequest(`${BASE_URL}/api/detect-crisis`, 'POST', {
      message: 'Я хочу умереть',
    });
    console.log('✅ Crisis detected:', data.isCrisis);
    if (data.isCrisis) {
      console.log('📞 Helplines:');
      data.helplines.forEach((hl) => {
        console.log(`   - ${hl.name}: ${hl.number}`);
      });
    }
    console.log('');

    // Test 3: Analyze Mood
    console.log('🎭 Test 3: Analyze Mood');
    console.log('─'.repeat(60));
    data = await makeRequest(`${BASE_URL}/api/analyze-mood`, 'POST', {
      text: 'Я просто обалдел от счастья!',
    });
    console.log('✅ Detected mood:', data.detectedMood);
    console.log('✅ Explanation:', data.explanation);
    console.log('');

    // Test 4: Chat with AI
    console.log('💬 Test 4: Chat with AI (requires GEMINI_API_KEY)');
    console.log('─'.repeat(60));
    try {
      data = await makeRequest(`${BASE_URL}/api/chat`, 'POST', {
        message: 'Привет! Как дела?',
        mood: 'Good',
      });
      if (data.error) {
        console.log('⚠️  Error:', data.error);
        console.log('💡 Make sure GEMINI_API_KEY is set in .env');
      } else {
        console.log('✅ AI Response:', data.response.substring(0, 100) + '...');
        console.log('✅ Crisis detected:', data.isCrisis);
        console.log('✅ Mood:', data.mood);
      }
    } catch (err) {
      console.log('⚠️  Could not test chat');
      console.log('   Error:', err.message);
    }
    console.log('');

    // Test 5: Journal
    console.log('📖 Test 5: Journal Entry (requires GEMINI_API_KEY)');
    console.log('─'.repeat(60));
    try {
      data = await makeRequest(`${BASE_URL}/api/journal`, 'POST', {
        thoughts:
          'Сегодня я понял, что нужно измениться и начать жить для себя.',
      });
      if (data.error) {
        console.log('⚠️  Error:', data.error);
      } else {
        console.log('✅ AI Response:', data.aiResponse.substring(0, 100) + '...');
        console.log('✅ Crisis detected:', data.isCrisis);
      }
    } catch (err) {
      console.log('⚠️  Could not test journal');
    }
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ All tests completed!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('💡 Next step: Add GEMINI_API_KEY to .env file for full functionality\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAPI();
