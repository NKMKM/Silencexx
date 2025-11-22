import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Проверка сообщения на запрещенный контент
 * Возвращает { allowed: boolean, reason?: string }
 */
export async function moderateMessage(message: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Ты модератор контента. Проверь следующее сообщение на наличие:
1. Буллинга, оскорблений, угроз, негатива
2. Контактной информации: email, телефон, ссылки, username соцсетей (Instagram, Telegram, VK, Twitter и т.д.)
3. Попыток обмена контактами

Сообщение: "${message}"

Ответь ТОЛЬКО в формате JSON:
{
  "allowed": true/false,
  "reason": "краткая причина отклонения (если allowed=false)"
}

Если сообщение содержит ЛЮБУЮ контактную информацию или негатив - allowed должен быть false.
Позитивные пожелания без контактов - allowed true.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Извлекаем JSON из ответа
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ AI response not in JSON format:', responseText);
      return { allowed: false, reason: 'Ошибка проверки сообщения' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('🔍 Message moderation result:', parsed);
    return parsed;

  } catch (error) {
    console.error('❌ Moderation error:', error);
    // В случае ошибки - блокируем из предосторожности
    return { allowed: false, reason: 'Ошибка проверки сообщения' };
  }
}
