# Используем Ubuntu с Node.js (более стабильный вариант)
FROM ubuntu:20.04

# Устанавливаем Node.js 18.x
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get install -y python3 \
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
