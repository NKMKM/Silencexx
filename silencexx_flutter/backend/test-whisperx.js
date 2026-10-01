// Simple test script for WhisperX transcription
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptPath = path.join(__dirname, 'scripts/transcribe.py');
const pythonPath = 'C:\\Users\\artem\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';

console.log('📋 WhisperX Test Script');
console.log('========================');
console.log('Script path:', scriptPath);
console.log('Python path:', pythonPath);
console.log('Script exists:', fs.existsSync(scriptPath));
console.log('');

// Test 1: Check if WhisperX can be imported
console.log('Test 1: Checking WhisperX import...');
exec(`"${pythonPath}" -c "import whisperx; import torch; print('WhisperX:', 'OK'); print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available())"`, (err, stdout, stderr) => {
    if (err) {
        console.error('❌ WhisperX import failed:', stderr || err.message);
    } else {
        console.log('✅ WhisperX check passed:');
        console.log(stdout);
    }
    
    // Test 2: Check if script runs with mock mode
    console.log('\nTest 2: Testing transcribe.py with MOCK_WHISPER=true...');
    const env = { ...process.env, MOCK_WHISPER: 'true' };
    exec(`"${pythonPath}" "${scriptPath}" "dummy.m4a" ru`, { env }, (err2, stdout2, stderr2) => {
        if (err2 && !stdout2) {
            console.error('❌ Script test failed:', stderr2 || err2.message);
        } else {
            console.log('✅ Mock mode result:');
            try {
                const result = JSON.parse(stdout2);
                console.log(JSON.stringify(result, null, 2));
            } catch(e) {
                console.log('Raw output:', stdout2);
            }
        }
        
        console.log('\n========================');
        console.log('Tests completed!');
        console.log('\nTo test with real audio, send a voice message from the app');
        console.log('and watch the backend console for [VOICE] and [PIPELINE] logs.');
    });
});
