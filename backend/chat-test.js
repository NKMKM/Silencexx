#!/usr/bin/env node

/**
 * 💬 CloudMind Interactive Chat Test
 * Интерактивный тест чата с сохранением истории
 */

const http = require('http');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';

// История чата
let conversationHistory = [];

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

async function sendMessage(userMessage) {
  try {
    console.log('\n⏳ Ожидаем ответ от AI...\n');

    const response = await makeRequest(`${BASE_URL}/api/chat`, 'POST', {
      message: userMessage,
      conversationHistory: conversationHistory,
    });

    if (response.error) {
      console.log('❌ Ошибка:', response.error);
      console.log(
        '💡 Убедитесь, что backend запущен (npm run dev) и GEMINI_API_KEY установлен в .env'
      );
      return;
    }

    // Добавляем в историю
    conversationHistory.push({
      role: 'user',
      text: userMessage,
    });

    conversationHistory.push({
      role: 'model',
      text: response.response,
    });

    // Показываем ответ
    console.log('🤖 CloudMind:');
    console.log(response.response);

    if (response.isCrisis) {
      console.log('\n🆘 ОБНАРУЖЕНЫ ПРИЗНАКИ КРИЗИСА!');
      console.log(
        '📞 Обратитесь в кризисную службу: 8-800-2000-122 или 8-800-100-49-94'
      );
    }
  } catch (error) {
    console.error('❌ Ошибка при отправке сообщения:', error.message);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              💬 CloudMind Interactive Chat 💬              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Введите сообщение и нажмите Enter                        ║');
  console.log('║  Введите "exit" или "quit" чтобы выйти                   ║');
  console.log('║  Введите "clear" чтобы очистить историю                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question('👤 Вы: ', async (input) => {
      const userInput = input.trim();

      if (!userInput) {
        askQuestion();
        return;
      }

      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        console.log('\n👋 До свидания!\n');
        rl.close();
        return;
      }

      if (userInput.toLowerCase() === 'clear') {
        conversationHistory = [];
        console.log('\n✅ История чата очищена\n');
        askQuestion();
        return;
      }

      await sendMessage(userInput);
      console.log('\n-------------------------------------------\n');
      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
