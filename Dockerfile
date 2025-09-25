# Используем Alpine Linux с Node.js (минимальный образ) - FORCE UPDATE
FROM alpine:3.18

# Устанавливаем Node.js и необходимые пакеты
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++ \
    curl

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости (с очисткой кэша)
RUN npm cache clean --force && npm install --production

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 8080

# Запускаем приложение
CMD ["npm", "start"]
