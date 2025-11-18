const http = require('http');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../silencexx/ngrok-url.json');

console.log('🔄 Updating ngrok URL...\n');

http.get('http://localhost:4040/api/tunnels', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const httpsTunnel = json.tunnels.find(t => t.proto === 'https');
      
      if (httpsTunnel) {
        const ngrokUrl = httpsTunnel.public_url;
        
        const config = {
          url: ngrokUrl,
          apiUrl: `${ngrokUrl}/api`,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Ngrok URL updated!');
        console.log(`📡 URL: ${ngrokUrl}`);
        console.log(`🔗 API: ${ngrokUrl}/api`);
        console.log(`💾 Config saved to: ${configPath}\n`);
        console.log('📱 Please reload your Expo app (press "r" in Expo terminal)\n');
      } else {
        console.error('❌ No HTTPS tunnel found');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('❌ Failed to connect to ngrok API');
  console.error('   Make sure ngrok is running: ngrok http 3000');
  console.error('   Error:', error.message);
});
