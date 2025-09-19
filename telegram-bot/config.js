// Конфигурация Telegram бота
module.exports = {
    // Telegram Bot Configuration
    BOT_TOKEN: process.env.BOT_TOKEN || '8480976603:AAEGRcUo1KrjRpK7G4qqT93JllxYEL1rxMQ',
    WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://your-domain.com/webhook',
    
    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL || './database.sqlite',
    
    // Game Server Configuration
    GAME_SERVER_URL: process.env.GAME_SERVER_URL || 'http://localhost:3001',
    
    // Referral System
    REFERRAL_BONUS: parseInt(process.env.REFERRAL_BONUS) || 10,
    REFERRAL_PERCENTAGE: parseInt(process.env.REFERRAL_PERCENTAGE) || 10,
    
    // Media URLs - используем прямые ссылки на изображения
    MEDIA: {
        WELCOME_PHOTO: 'https://drive.google.com/uc?export=view&id=1DVFh1fEm5CG0crg_OYWKBrLIjnmgwjm8',
        ABOUT_PROJECT: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop',
        COMMUNITY: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop',
        PLAY_GAME: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=300&fit=crop',
        GET_CLIENTS: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop',
        EARN_MONEY: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop'
    },
    
    // Messages
    MESSAGES: {
        WELCOME: `👋 Привет друг! 👑 (подруга)

Добро пожаловать в Энергию Денег 

✨ — пространство, где игра соединяется с реальными возможностями в квантовом поле.

Здесь ты сможешь:
• 🫂 найти друзей
• увеличить доход 
• 🤝 найти клиентов 
• 🎲 играть и развиваться 

🎯 Выбирай, что интересно прямо сейчас!`,

        ABOUT_PROJECT: `🎮 О проекте "Энергия денег"

Это уникальная игра, которая объединяет развлечение с реальными возможностями заработка. 

В нашей игре вы сможете:
• 🎯 Развивать финансовую грамотность
• 💰 Получать реальный доход
• 🤝 Находить партнеров и клиентов
• 🌟 Присоединяться к активному сообществу

Начните свой путь к финансовой свободе уже сегодня!`,

        GET_CLIENTS: `🤝 Получить клиентов

Хотите расширить свою клиентскую базу? 
Станьте мастером нашей игры и получите доступ к тысячам потенциальных клиентов!

Преимущества:
• 🎯 Целевая аудитория
• 💼 Готовые инструменты
• 📈 Поддержка в развитии
• 💰 Дополнительный доход`,

        EARN_MONEY: `💰 Доход

Зарабатывайте вместе с нами! 
Приглашайте друзей и получайте бонусы за каждого нового участника.

🎁 Бонусы:
• 💵 10$ на счет за каждого друга
• 📊 10% от будущих трат рефералов
• 🎮 Бонусы для трат в игре

💡 Пригласите друга и получите 10$ на счет!`,

        COMMUNITY: `🌐 Сообщество

Добро пожаловать в наше сообщество!  
Здесь мы объединяем людей, которые хотят расти, делиться опытом и находить новых друзей, партнёров и клиентов.  
Это место поддержки, энергии и совместного развития.`,

        PLAY_GAME: `🎲 Играть

Добро пожаловать в игру "Энергия денег"!

🎮 Особенности игры:
• 🎯 Стратегическое мышление
• 💰 Реальные возможности заработка
• 🤝 Взаимодействие с сообществом
• 📈 Развитие финансовой грамотности

Начните играть прямо сейчас!`
    }
};
