# Используем официальный Node.js образ (стабильная версия)
FROM node:18.20.4-slim

# Обновляем пакеты и устанавливаем необходимые зависимости
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

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
