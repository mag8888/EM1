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
        let justRegistered = false;
        if (!user) {
            try {
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
                justRegistered = true;
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT') {
                    // Пользователь уже существует, получаем его данные
                    user = await this.db.getUser(telegramId);
                } else {
                    throw error;
                }
            }
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

        // Если это первый вход пользователя, отправим сообщение через 30 секунд
        if (justRegistered) {
            setTimeout(() => {
                this.bot.sendMessage(
                    chatId,
                    'Ваш счет пополнен на 10$ — приглашайте друзей и за каждого получите 10$, которые сможете потратить на игру'
                ).catch(() => {});
            }, 30000);
        }
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

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
                    await this.showPlayGame(chatId, messageId, telegramId);
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
                    } else if (data.startsWith('copy_code_')) {
                        const referralCode = data.replace('copy_code_', '');
                        await this.copyReferralCode(chatId, referralCode);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling callback query:', error);
        }
    }

    async handleMessage(msg) {
        if (!msg || !msg.text) return;
        const chatId = msg.chat.id;
        const telegramId = msg.from.id;
        const text = (msg.text || '').trim();

        try {
            if (text.includes('О проекте')) {
                await this.showAboutProject(chatId);
                return;
            }

            if (text.includes('Доход')) {
                await this.showEarnMoney(chatId);
                return;
            }

            if (text.includes('Получить клиентов')) {
                await this.showGetClients(chatId);
                return;
            }

            if (text.includes('Играть')) {
                await this.showPlayGame(chatId, null, telegramId);
                return;
            }

            if (text.includes('Сообщество')) {
                await this.showCommunity(chatId);
                return;
            }

            if (text.includes('Главное меню')) {
                await this.showMainMenu(chatId);
                return;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    // Методы для показа различных разделов
    async showMainMenu(chatId, messageId) {
        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getMainMenu()
        };

        if (messageId) {
            await this.bot.editMessageText('🏠 Главное меню\n\nВыберите интересующий раздел:', payload);
        } else {
            await this.bot.sendMessage(chatId, '🏠 Главное меню\n\nВыберите интересующий раздел:', payload);
        }
    }

    async showAboutProject(chatId, messageId) {
        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getAboutProjectKeyboard()
        };
        if (messageId) {
            await this.bot.editMessageText(config.MESSAGES.ABOUT_PROJECT, payload);
        } else {
            await this.bot.sendPhoto(chatId, config.MEDIA.ABOUT_PROJECT, {
                caption: config.MESSAGES.ABOUT_PROJECT,
                ...Keyboards.getAboutProjectKeyboard()
            });
        }
    }

    async showGetClients(chatId, messageId) {
        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getGetClientsKeyboard()
        };
        if (messageId) {
            await this.bot.editMessageText(config.MESSAGES.GET_CLIENTS, payload);
        } else {
            await this.bot.sendPhoto(chatId, config.MEDIA.GET_CLIENTS, {
                caption: config.MESSAGES.GET_CLIENTS,
                ...Keyboards.getGetClientsKeyboard()
            });
        }
    }

    async showEarnMoney(chatId, messageId) {
        const user = await this.db.getUser(chatId);
        const balance = user && typeof user.balance === 'number' ? user.balance : 0;
        const header = `💰 Доход_____ Баланс ${balance.toFixed(2)}$`;
        const body = (config.MESSAGES.EARN_MONEY || '').replace(/^.*?\n/, '');
        const text = `${header}\n\n${body}`.trim();

        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getEarnMoneyKeyboard()
        };
        if (messageId) {
            await this.bot.editMessageText(text, payload);
        } else {
            await this.bot.sendPhoto(chatId, config.MEDIA.EARN_MONEY, {
                caption: text,
                ...Keyboards.getEarnMoneyKeyboard()
            });
        }
    }

    async showPlayGame(chatId, messageId, telegramId = null) {
        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getPlayGameKeyboard(telegramId)
        };
        if (messageId) {
            await this.bot.editMessageText(config.MESSAGES.PLAY_GAME, payload);
        } else {
            await this.bot.sendPhoto(chatId, config.MEDIA.PLAY_GAME, {
                caption: config.MESSAGES.PLAY_GAME,
                ...Keyboards.getPlayGameKeyboard(telegramId)
            });
        }
    }

    async showCommunity(chatId, messageId) {
        const payload = {
            chat_id: chatId,
            ...(messageId ? { message_id: messageId } : {}),
            ...Keyboards.getCommunityKeyboard()
        };
        if (messageId) {
            await this.bot.editMessageText(config.MESSAGES.COMMUNITY, payload);
        } else {
            await this.bot.sendPhoto(chatId, config.MEDIA.COMMUNITY, {
                caption: config.MESSAGES.COMMUNITY,
                ...Keyboards.getCommunityKeyboard()
            });
        }
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

        const referralLink = `https://t.me/energy_m_bot?start=${user.referral_code}`;
        
        const text =
            `👥 Пригласи друга и получи ${config.REFERRAL_BONUS}$!\n\n` +
            `🔗 Реферальная ссылка:\n` +
            `\`${referralLink}\`\n\n` +
            `🔢 Твой реферальный код: \`${user.referral_code}\`\n\n` +
            `💡 Как это работает:\n` +
            `• Отправьте ссылку или код другу\n` +
            `• Друг регистрируется по ссылке/коду\n` +
            `• Вы получаете ${config.REFERRAL_BONUS}$ на счет\n` +
            `• Дополнительно 10% от всех трат друга в игре`;

        if (messageId) {
            try {
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    ...Keyboards.getReferralLinkKeyboard(user.referral_code)
                });
            } catch (error) {
                // Если не можем редактировать, отправляем новое сообщение
                await this.bot.sendMessage(chatId, text, {
                    parse_mode: 'Markdown',
                    ...Keyboards.getReferralLinkKeyboard(user.referral_code)
                });
            }
        } else {
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                ...Keyboards.getReferralLinkKeyboard(user.referral_code)
            });
        }
    }

    async showMyPartners(chatId, messageId) {
        const text = '👥 Мои партнеры\n\nВыберите действие:';
        try {
            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getMyPartnersKeyboard()
            });
        } catch (error) {
            await this.bot.sendMessage(chatId, text, {
                ...Keyboards.getMyPartnersKeyboard()
            });
        }
    }

    async showPartnerStats(chatId, messageId) {
        const stats = await this.db.getReferralStats(chatId);
        const text =
            `📊 Статистика партнеров\n\n` +
            `👥 Всего приглашено: ${stats.total_referrals}\n` +
            `💰 Общий бонус: ${stats.total_bonus}$\n` +
            `✅ Получено: ${stats.completed_bonus}$\n` +
            `⏳ В обработке: ${stats.total_bonus - stats.completed_bonus}$`;
        try {
            await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getBackKeyboard('my_partners')
            });
        } catch (error) {
            await this.bot.sendMessage(chatId, text, {
                ...Keyboards.getBackKeyboard('my_partners')
            });
        }
    }

    async showPartnerList(chatId, messageId) {
        const partners = await this.db.getReferralList(chatId);
        
        let message = '👥 Список ваших партнеров:\n\n';
        
        if (partners.length === 0) {
            message += '😔 У вас пока нет партнеров.\nПригласите друзей и начните зарабатывать!';
        } else {
            partners.forEach((partner, index) => {
                const username = partner.username ? `@${partner.username}` : '';
                const fullName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();
                const name = username || fullName || partner.telegram_id;
                const date = new Date(partner.created_at).toLocaleDateString('ru-RU');
                message += `${index + 1}. ${name}\n`;
                message += `   💰 Бонус: ${partner.bonus_amount}$\n`;
                message += `   📅 Дата: ${date}\n\n`;
            });
        }
        try {
            await this.bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                ...Keyboards.getBackKeyboard('my_partners')
            });
        } catch (error) {
            await this.bot.sendMessage(chatId, message, {
                ...Keyboards.getBackKeyboard('my_partners')
            });
        }
    }

    async copyReferralLink(chatId, referralCode) {
        const referralLink = `https://t.me/energy_m_bot?start=${referralCode}`;
        
        await this.bot.sendMessage(
            chatId,
            `📋 Реферальная ссылка скопирована!\n\n\`${referralLink}\`\n\n💡 Теперь можете поделиться ею с друзьями!`,
            { parse_mode: 'Markdown' }
        );
    }

    async copyReferralCode(chatId, referralCode) {
        await this.bot.sendMessage(
            chatId,
            `📋 Реферальный код скопирован!\n\n\`${referralCode}\`\n\n💡 Отправьте его другу — он может запустить бота по ссылке и ввести код.`,
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

