const config = require('./config');
const Keyboards = require('./keyboards');
const Database = require('./database');

class Handlers {
    constructor(bot, db) {
        this.bot = bot;
        this.db = db;
        this.setupHandlers();
    }

    setupHandlers() {
        // Команда /start
        this.bot.onText(/\/start(.*)/, (msg, match) => {
            this.handleStart(msg, match);
        });

        // Обработка callback_query
        this.bot.on('callback_query', (callbackQuery) => {
            this.handleCallbackQuery(callbackQuery);
        });

        // Обработка текстовых сообщений
        this.bot.on('message', (msg) => {
            this.handleMessage(msg);
        });
    }

    async handleStart(msg, match) {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id;
        const username = msg.from.username;
        const firstName = msg.from.first_name;
        const lastName = msg.from.last_name;
        
        // Проверяем реферальный код
        const referralCode = match[1] ? match[1].trim() : null;
        let referredBy = null;

        // Регистрируем пользователя
        let user = await this.db.getUser(telegramId);
        if (!user) {
            const userReferralCode = this.db.generateReferralCode(telegramId);
            await this.db.createUser({
                telegramId,
                username,
                firstName,
                lastName,
                referralCode: userReferralCode,
                referredBy
            });
            user = await this.db.getUser(telegramId);
        }

        // Обработка реферала
        if (referralCode && referralCode !== user.referral_code) {
            const referrer = await this.findUserByReferralCode(referralCode);
            if (referrer && !user.referred_by) {
                // Обновляем пользователя
                await this.db.db.run(
                    'UPDATE users SET referred_by = ? WHERE telegram_id = ?',
                    [referrer.telegram_id, telegramId]
                );

                // Создаем реферал
                await this.db.createReferral(referrer.telegram_id, telegramId, config.REFERRAL_BONUS);
                
                // Начисляем бонус рефереру
                await this.db.updateUserBalance(referrer.telegram_id, config.REFERRAL_BONUS);
                
                // Создаем транзакцию
                await this.db.createTransaction(
                    referrer.telegram_id,
                    'referral_bonus',
                    config.REFERRAL_BONUS,
                    `Бонус за приглашение ${firstName || username}`
                );

                // Уведомляем реферера
                this.bot.sendMessage(
                    referrer.telegram_id,
                    `🎉 Ваш счет пополнен на ${config.REFERRAL_BONUS}$!\n` +
                    `👤 Новый игрок присоединился по вашей ссылке: ${firstName || username}\n` +
                    `🎮 Заходите в игру и тратьте бонусы!`
                );
            }
        }

        // Отправляем приветствие с фото
        this.bot.sendPhoto(
            chatId,
            config.MEDIA.WELCOME_PHOTO,
            {
                caption: config.MESSAGES.WELCOME,
                ...Keyboards.getMainMenu()
            }
        );
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;

        try {
            await this.bot.answerCallbackQuery(callbackQuery.id);

            switch (data) {
                case 'main_menu':
                    await this.showMainMenu(chatId, messageId);
                    break;

                case 'about_project':
                    await this.showAboutProject(chatId, messageId);
                    break;

                case 'get_clients':
                    await this.showGetClients(chatId, messageId);
                    break;

                case 'earn_money':
                    await this.showEarnMoney(chatId, messageId);
                    break;

                case 'play_game':
                    await this.showPlayGame(chatId, messageId);
                    break;

                case 'community':
                    await this.showCommunity(chatId, messageId);
                    break;

                case 'become_master':
                    await this.handleBecomeMaster(chatId, messageId);
                    break;

                case 'invite_friend':
                    await this.showInviteFriend(chatId, messageId);
                    break;

                case 'my_partners':
                    await this.showMyPartners(chatId, messageId);
                    break;

                case 'partner_stats':
                    await this.showPartnerStats(chatId, messageId);
                    break;

                case 'partner_list':
                    await this.showPartnerList(chatId, messageId);
                    break;

                case 'watch_about_video':
                    await this.showAboutVideo(chatId, messageId);
                    break;

                case 'watch_community_video':
                    await this.showCommunityVideo(chatId, messageId);
                    break;

                case 'watch_game_video':
                    await this.showGameVideo(chatId, messageId);
                    break;

                case 'close':
                    await this.bot.deleteMessage(chatId, messageId);
                    break;

                default:
                    if (data.startsWith('copy_link_')) {
                        const referralCode = data.replace('copy_link_', '');
                        await this.copyReferralLink(chatId, referralCode);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling callback query:', error);
        }
    }

    async handleMessage(msg) {
        // Обработка текстовых сообщений (если нужно)
    }

    // Методы для показа различных разделов
    async showMainMenu(chatId, messageId) {
        await this.bot.editMessageText(
            '🏠 Главное меню\n\nВыберите интересующий раздел:',
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getMainMenu()
            }
        );
    }

    async showAboutProject(chatId, messageId) {
        await this.bot.editMessageText(
            config.MESSAGES.ABOUT_PROJECT,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getAboutProjectKeyboard()
            }
        );
    }

    async showGetClients(chatId, messageId) {
        await this.bot.editMessageText(
            config.MESSAGES.GET_CLIENTS,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getGetClientsKeyboard()
            }
        );
    }

    async showEarnMoney(chatId, messageId) {
        await this.bot.editMessageText(
            config.MESSAGES.EARN_MONEY,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getEarnMoneyKeyboard()
            }
        );
    }

    async showPlayGame(chatId, messageId) {
        await this.bot.editMessageText(
            config.MESSAGES.PLAY_GAME,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getPlayGameKeyboard()
            }
        );
    }

    async showCommunity(chatId, messageId) {
        await this.bot.editMessageText(
            config.MESSAGES.COMMUNITY,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getCommunityKeyboard()
            }
        );
    }

    async handleBecomeMaster(chatId, messageId) {
        const user = await this.db.getUser(chatId);
        if (!user) return;

        // Создаем заявку на мастера
        await this.db.createMasterApplication(chatId);

        await this.bot.editMessageText(
            '✅ Заявка отправлена!\n\n👨‍💼 С вами свяжется менеджер в ближайшее время для обсуждения условий сотрудничества.\n\n📞 Мы рассмотрим вашу заявку и дадим обратную связь.',
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getCloseKeyboard()
            }
        );
    }

    async showInviteFriend(chatId, messageId) {
        const user = await this.db.getUser(chatId);
        if (!user) return;

        const referralLink = `https://t.me/your_bot_username?start=${user.referral_code}`;
        
        await this.bot.editMessageText(
            `👥 Пригласи друга и получи ${config.REFERRAL_BONUS}$!\n\n` +
            `🔗 Ваша реферальная ссылка:\n` +
            `\`${referralLink}\`\n\n` +
            `💡 Как это работает:\n` +
            `• Отправьте ссылку другу\n` +
            `• Друг регистрируется по ссылке\n` +
            `• Вы получаете ${config.REFERRAL_BONUS}$ на счет\n` +
            `• Дополнительно 10% от всех трат друга в игре`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                ...Keyboards.getReferralLinkKeyboard(user.referral_code)
            }
        );
    }

    async showMyPartners(chatId, messageId) {
        await this.bot.editMessageText(
            '👥 Мои партнеры\n\nВыберите действие:',
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getMyPartnersKeyboard()
            }
        );
    }

    async showPartnerStats(chatId, messageId) {
        const stats = await this.db.getReferralStats(chatId);
        
        await this.bot.editMessageText(
            `📊 Статистика партнеров\n\n` +
            `👥 Всего приглашено: ${stats.total_referrals}\n` +
            `💰 Общий бонус: ${stats.total_bonus}$\n` +
            `✅ Получено: ${stats.completed_bonus}$\n` +
            `⏳ В обработке: ${stats.total_bonus - stats.completed_bonus}$`,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getBackKeyboard('my_partners')
            }
        );
    }

    async showPartnerList(chatId, messageId) {
        const partners = await this.db.getReferralList(chatId);
        
        let message = '👥 Список ваших партнеров:\n\n';
        
        if (partners.length === 0) {
            message += '😔 У вас пока нет партнеров.\nПригласите друзей и начните зарабатывать!';
        } else {
            partners.forEach((partner, index) => {
                const name = partner.username || `${partner.first_name} ${partner.last_name}`.trim();
                const date = new Date(partner.created_at).toLocaleDateString('ru-RU');
                message += `${index + 1}. ${name}\n`;
                message += `   💰 Бонус: ${partner.bonus_amount}$\n`;
                message += `   📅 Дата: ${date}\n\n`;
            });
        }
        
        await this.bot.editMessageText(
            message,
            {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getBackKeyboard('my_partners')
            }
        );
    }

    async copyReferralLink(chatId, referralCode) {
        const referralLink = `https://t.me/your_bot_username?start=${referralCode}`;
        
        await this.bot.sendMessage(
            chatId,
            `📋 Реферальная ссылка скопирована!\n\n\`${referralLink}\`\n\n💡 Теперь можете поделиться ею с друзьями!`,
            { parse_mode: 'Markdown' }
        );
    }

    // Методы для показа видео
    async showAboutVideo(chatId, messageId) {
        await this.bot.sendVideo(
            chatId,
            config.MEDIA.ABOUT_PROJECT,
            {
                caption: '📹 Видео о проекте "Энергия денег"'
            }
        );
    }

    async showCommunityVideo(chatId, messageId) {
        await this.bot.sendVideo(
            chatId,
            config.MEDIA.COMMUNITY,
            {
                caption: '📹 Видео о нашем сообществе'
            }
        );
    }

    async showGameVideo(chatId, messageId) {
        await this.bot.sendVideo(
            chatId,
            config.MEDIA.PLAY_GAME,
            {
                caption: '📹 Как играть в "Энергию денег"'
            }
        );
    }

    // Вспомогательные методы
    async findUserByReferralCode(referralCode) {
        return new Promise((resolve, reject) => {
            this.db.db.get(
                'SELECT * FROM users WHERE referral_code = ?',
                [referralCode],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }
}

module.exports = Handlers;

