#!/bin/bash

echo "🤖 Запуск Telegram бота..."

# Переходим в папку бота
cd "$(dirname "$0")"

# Проверяем зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

# Запускаем бота
echo "🚀 Запускаем бота..."
node index.js
