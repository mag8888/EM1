const { InlineKeyboard } = require('node-telegram-bot-api');

class Keyboards {
    // Главное меню
    static getMainMenu() {
        return {
            reply_markup: {
                keyboard: [
                    [
                        { text: '🎮 О проекте', callback_data: 'about_project' },
                        { text: '💰 Доход', callback_data: 'earn_money' }
                    ],
                    [
                        { text: '🤝 Получить клиентов', callback_data: 'get_clients' }
                    ],
                    [
                        { text: '🎲 Играть', callback_data: 'play_game' },
                        { text: '🌐 Сообщество', callback_data: 'community' }
                    ]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };
    }

    // Кнопки для раздела "О проекте"
    static getAboutProjectKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📹 Смотреть видео', callback_data: 'watch_about_video' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопки для раздела "Получить клиентов"
    static getGetClientsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '👨‍💼 Стать мастером', callback_data: 'become_master' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопки для раздела "Доход"
    static getEarnMoneyKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '👥 Пригласи друга', callback_data: 'invite_friend' }
                    ],
                    [
                        { text: '📊 Мои партнеры', callback_data: 'my_partners' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопки для раздела "Сообщество"
    static getCommunityKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📹 Смотреть видео', callback_data: 'watch_community_video' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопки для раздела "Играть"
    static getPlayGameKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🎮 Начать игру', url: 'http://localhost:3001/working' }
                    ],
                    [
                        { text: '📹 Смотреть видео', callback_data: 'watch_game_video' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопки для раздела "Мои партнеры"
    static getMyPartnersKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📈 Статистика', callback_data: 'partner_stats' }
                    ],
                    [
                        { text: '👥 Список партнеров', callback_data: 'partner_list' }
                    ],
                    [
                        { text: '💰 Доход', callback_data: 'earn_money' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            }
        };
    }

    // Кнопка "Назад"
    static getBackKeyboard(section) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⬅️ Назад', callback_data: section }
                    ]
                ]
            }
        };
    }

    // Кнопка подтверждения
    static getConfirmationKeyboard(action, data = '') {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да', callback_data: `confirm_${action}_${data}` },
                        { text: '❌ Нет', callback_data: 'cancel' }
                    ]
                ]
            }
        };
    }

    // Кнопка закрытия
    static getCloseKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '❌ Закрыть', callback_data: 'close' }
                    ]
                ]
            }
        };
    }

    // Кнопка для копирования реферальной ссылки
    static getReferralLinkKeyboard(referralCode) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Копировать ссылку', callback_data: `copy_link_${referralCode}` }
                    ],
                    [
                        { text: '⬅️ Назад', callback_data: 'earn_money' }
                    ]
                ]
            }
        };
    }
}

module.exports = Keyboards;

