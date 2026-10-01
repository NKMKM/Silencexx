-- Добавляем недостающие колонки в subscription_tiers
-- Дата: 2026-02-03

-- Добавляем колонку price_monthly
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10, 2) DEFAULT 0;

-- Добавляем колонку description
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS description TEXT;

-- Обновляем цены для тарифов
UPDATE subscription_tiers SET price_monthly = 0, description = 'Бесплатный тариф с ограниченным доступом' WHERE slug = 'free';
UPDATE subscription_tiers SET price_monthly = 299, description = 'Расширенный доступ к чату и голосовым сообщениям' WHERE slug = 'plus';
UPDATE subscription_tiers SET price_monthly = 599, description = 'Полный доступ ко всем функциям без ограничений' WHERE slug = 'pro';

-- Анализ таблицы
ANALYZE subscription_tiers;

SELECT 'subscription_tiers price_monthly column added successfully!' as status;
