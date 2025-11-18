const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Путь к файлу с ngrok URL
const ngrokUrlFile = path.join(__dirname, '../silencexx/ngrok-url.json');

console.log('🚀 Starting backend with ngrok...\n');

// Запускаем backend сервер
const backendProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Даем серверу время запуститься
setTimeout(() => {
  console.log('\n🌐 Starting ngrok tunnel...\n');
  
  // Запускаем ngrok
  const ngrokProcess = spawn('ngrok', ['http', '3000'], {
    shell: true,
    stdio: 'pipe'
  });

  // Функция для получения ngrok URL через API
  const getNgrokUrl = () => {
    setTimeout(() => {
      http.get('http://localhost:4040/api/tunnels', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const tunnel = json.tunnels.find(t => t.proto === 'https');
            
            if (tunnel) {
              const ngrokUrl = tunnel.public_url;
              console.log('\n✅ Ngrok tunnel established!');
              console.log(`📡 Public URL: ${ngrokUrl}`);
              console.log(`🔗 API URL: ${ngrokUrl}/api\n`);

              // Сохраняем URL в файл для frontend
              const urlData = {
                url: ngrokUrl,
                apiUrl: `${ngrokUrl}/api`,
                timestamp: new Date().toISOString()
              };

              fs.writeFileSync(ngrokUrlFile, JSON.stringify(urlData, null, 2));
              console.log(`💾 URL saved to: ${ngrokUrlFile}\n`);
              console.log('📱 Reload your Expo app to use the new URL\n');
            } else {
              console.log('⏳ Waiting for ngrok tunnel...');
              getNgrokUrl();
            }
          } catch (error) {
            console.log('⏳ Waiting for ngrok API...');
            getNgrokUrl();
          }
        });
      }).on('error', () => {
        console.log('⏳ Waiting for ngrok to start...');
        getNgrokUrl();
      });
    }, 2000);
  };

  getNgrokUrl();

  ngrokProcess.on('close', (code) => {
    console.log(`\n⚠️  Ngrok process exited with code ${code}`);
  });

}, 3000);

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  backendProcess.kill();
  process.exit();
});

backendProcess.on('close', (code) => {
  console.log(`\n⚠️  Backend process exited with code ${code}`);
  process.exit(code);
});
