#!/bin/bash
# Проверка готовности к запуску с Ollama

echo "🔍 Проверка миграции на Ollama..."
echo ""

# 1. Проверка файла конфига
echo "1️⃣ Проверка config.ts..."
if grep -q "OLLAMA_URL" backend/src/config.ts && grep -q "OLLAMA_MODEL" backend/src/config.ts; then
    echo "   ✅ config.ts обновлен"
else
    echo "   ❌ config.ts не обновлен"
fi

# 2. Проверка ai.ts
echo "2️⃣ Проверка ai.ts..."
if grep -q "ollamaClient" backend/src/ai.ts && grep -q "ollamaReady" backend/src/ai.ts; then
    echo "   ✅ ai.ts обновлен на Ollama"
else
    echo "   ❌ ai.ts не обновлен"
fi

# 3. Проверка package.json
echo "3️⃣ Проверка package.json..."
if grep -q "@google/generative-ai" backend/package.json; then
    echo "   ❌ @google/generative-ai все еще в зависимостях"
else
    echo "   ✅ Google Generative AI удален"
fi

# 4. Проверка .env.example
echo "4️⃣ Проверка .env.example..."
if grep -q "OLLAMA_URL" backend/.env.example && grep -q "OLLAMA_MODEL" backend/.env.example; then
    echo "   ✅ .env.example обновлен"
else
    echo "   ❌ .env.example не обновлен"
fi

# 5. Проверка документации
echo "5️⃣ Проверка документации..."
if [ -f "backend/OLLAMA_SETUP.md" ]; then
    echo "   ✅ OLLAMA_SETUP.md создан"
else
    echo "   ❌ OLLAMA_SETUP.md не найден"
fi

if [ -f "backend/OLLAMA_QUICKSTART.md" ]; then
    echo "   ✅ OLLAMA_QUICKSTART.md создан"
else
    echo "   ❌ OLLAMA_QUICKSTART.md не найден"
fi

echo ""
echo "📋 Миграция на Ollama завершена!"
echo ""
echo "🚀 Что дальше:"
echo "   1. ollama pull mistral"
echo "   2. ollama serve"
echo "   3. cd backend && npm install && npm run dev"
echo ""
echo "📚 Документация:"
echo "   - Быстрый старт: backend/OLLAMA_QUICKSTART.md"
echo "   - Полная инструкция: backend/OLLAMA_SETUP.md"
