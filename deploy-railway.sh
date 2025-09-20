#!/bin/bash

# EM1 Game Board v2.0 - Railway Deployment Script
# Скрипт для развертывания обновленной игровой логики на Railway

echo "🚀 EM1 Game Board v2.0 - Railway Deployment"
echo "============================================="

# Проверка наличия Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не найден. Установите его:"
    echo "npm install -g @railway/cli"
    echo "или"
    echo "curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

# Проверка авторизации в Railway
echo "🔐 Проверка авторизации в Railway..."
if ! railway whoami &> /dev/null; then
    echo "❌ Не авторизованы в Railway. Выполните:"
    echo "railway login"
    exit 1
fi

echo "✅ Авторизация в Railway успешна"

# Проверка git статуса
echo "📋 Проверка git статуса..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Есть незакоммиченные изменения:"
    git status --short
    echo ""
    read -p "Хотите закоммитить изменения перед развертыванием? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "🚀 Обновление игровой логики v2.0 для Railway"
        echo "✅ Изменения закоммичены"
    else
        echo "⚠️  Развертывание без коммита изменений"
    fi
else
    echo "✅ Все изменения закоммичены"
fi

# Обновление зависимостей
echo "📦 Обновление зависимостей..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Ошибка установки зависимостей"
    exit 1
fi
echo "✅ Зависимости обновлены"

# Проверка конфигурации Railway
echo "🔧 Проверка конфигурации Railway..."
if [ -f "railway.json" ]; then
    echo "✅ railway.json найден"
    cat railway.json | head -10
else
    echo "⚠️  railway.json не найден, будет использована конфигурация по умолчанию"
fi

# Проверка Procfile
echo "📄 Проверка Procfile..."
if [ -f "Procfile" ]; then
    echo "✅ Procfile найден:"
    cat Procfile
else
    echo "⚠️  Procfile не найден"
fi

# Проверка package.json
echo "📋 Проверка package.json..."
if grep -q "em1-game-board" package.json; then
    echo "✅ package.json обновлен для v2.0"
else
    echo "⚠️  package.json может быть не обновлен"
fi

# Локальное тестирование (опционально)
echo ""
read -p "Хотите запустить локальное тестирование перед развертыванием? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Запуск локального тестирования..."
    timeout 10s npm start &
    SERVER_PID=$!
    sleep 5
    
    # Проверка health endpoint
    if curl -s http://localhost:8080/api/health > /dev/null; then
        echo "✅ Сервер запущен и отвечает на запросы"
    else
        echo "⚠️  Сервер не отвечает на запросы"
    fi
    
    kill $SERVER_PID 2>/dev/null
    echo "🛑 Локальный сервер остановлен"
fi

# Развертывание на Railway
echo ""
echo "🚀 Начало развертывания на Railway..."
echo "Это может занять несколько минут..."

railway up --detach

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Развертывание успешно завершено!"
    echo ""
    echo "📊 Статус развертывания:"
    railway status
    
    echo ""
    echo "🔗 Получить URL приложения:"
    echo "railway domain"
    
    echo ""
    echo "📋 Логи приложения:"
    echo "railway logs"
    
    echo ""
    echo "🎮 Проверьте работоспособность:"
    echo "curl \$(railway domain)/api/health"
    
else
    echo "❌ Ошибка развертывания на Railway"
    echo "Проверьте логи: railway logs"
    exit 1
fi

echo ""
echo "🎯 Развертывание EM1 Game Board v2.0 завершено!"
echo "Новая игровая логика с генерацией клеток, системой ходов и обработкой событий активна!"
