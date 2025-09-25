# Используем Alpine Linux с Node.js (минимальный образ) - FORCE UPDATE
FROM node:18-alpine

# Устанавливаем Node.js и необходимые пакеты
RUN apk add --no-cache python3 make g++

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json
COPY package.json package-lock.json* ./

# Устанавливаем зависимости (с очисткой кэша)
RUN npm ci --omit=dev || npm install --production

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 8080

# Запускаем приложение
CMD ["npm", "start"]
