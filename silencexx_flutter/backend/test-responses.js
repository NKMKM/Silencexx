#!/usr/bin/env node

const http = require('http');
const readline = require('readline');

const API_URL = 'http://localhost:3000/api/chat';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let conversationHistory = [];

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    const payload = {
      message: message,
      mood: undefined,
      conversationHistory: conversationHistory
    };

    const postData = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('\n📤 Отправка:', message);
    console.log('📦 Размер истории:', conversationHistory.length, 'сообщений\n');

    const startTime = Date.now();

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        try {
          const response = JSON.parse(data);
          
          console.log('⏱️  Время ответа:', duration + 'ms');
          console.log('✅ Статус:', res.statusCode);
          
          if (response.response) {
            console.log('\n🤖 CloudMind ответил:');
            console.log('─'.repeat(60));
            console.log(response.response);
            console.log('─'.repeat(60) + '\n');

            // Сохраняем в историю
            conversationHistory.push({
              role: 'user',
              parts: [{ text: message }]
            });
            conversationHistory.push({
              role: 'model',
              parts: [{ text: response.response }]
            });

            console.log('📜 История обновлена:', conversationHistory.length, 'сообщений');
            
            if (response.isCrisis) {
              console.log('🚨 ВНИМАНИЕ: Обнаружен кризис!');
              console.log('📞 Показать номер телефона горячей линии');
            }
            
            console.log('\n');
            resolve(response);
          } else {
            console.log('❌ Ошибка:', response.error);
            resolve(response);
          }
        } catch (e) {
          console.log('❌ Ошибка парсинга JSON:', e.message);
          console.log('📝 Raw response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Ошибка запроса:', e.message);
      reject(e);
    });

    req.on('timeout', () => {
      console.error('❌ Timeout запроса (30s)');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(35000);
    req.write(postData);
    req.end();
  });
}

function prompt() {
  rl.question(
    '👤 Вы: ',
    async (message) => {
      if (!message) {
        prompt();
        return;
      }

      if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
        console.log('👋 До встречи!');
        rl.close();
        process.exit(0);
      }

      if (message.toLowerCase() === 'clear') {
        conversationHistory = [];
        console.log('🗑️  История очищена\n');
        prompt();
        return;
      }

      if (message.toLowerCase() === 'history') {
        console.log('\n📜 История сообщений:');
        conversationHistory.forEach((msg, i) => {
          const role = msg.role === 'user' ? '👤 Вы' : '🤖 CloudMind';
          console.log(`${i}. ${role}: ${msg.parts[0].text.substring(0, 50)}...`);
        });
        console.log('');
        prompt();
        return;
      }

      try {
        await sendMessage(message);
        prompt();
      } catch (error) {
        console.error('Error:', error.message);
        prompt();
      }
    }
  );
}

console.log(`
╔════════════════════════════════════════════════════════╗
║      🌥️  CloudMind Interactive Tester 🌥️             ║
╠════════════════════════════════════════════════════════╣
║  Подключение к: http://localhost:3000                 ║
║                                                        ║
║  Команды:                                              ║
║  • Введите сообщение для отправки                     ║
║  • "clear" - очистить историю                         ║
║  • "history" - показать историю                       ║
║  • "exit" или "quit" - выйти                          ║
║                                                        ║
║  💡 Смотрите логи backend в другом окне терминала!  ║
╚════════════════════════════════════════════════════════╝
`);

// Проверка подключения
const testReq = http.get('http://localhost:3000/health', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Backend доступен на http://localhost:3000\n');
    prompt();
  }
});

testReq.on('error', (e) => {
  console.error('❌ Backend не доступен:', e.message);
  console.log('\n📌 Убедитесь что backend запущен: cd backend && npm run dev\n');
  process.exit(1);
});
