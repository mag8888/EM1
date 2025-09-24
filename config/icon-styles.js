// Стили иконок для клеток игры
// Поддерживает разные визуальные стили: эмодзи, однотонные, контурные и т.д.

const ICON_STYLES = {
    emoji: {
        name: 'Эмодзи',
        description: 'Цветные эмодзи иконки',
        icons: {
            'green_opportunity': '💚',
            'pink_expense': '🛒',
            'orange_charity': '❤️',
            'blue_dividend': '💰',
            'purple_business': '🏪',
            'yellow_baby': '👶',
            'red_downsize': '💸',
            'default': '⬤'
        }
    },
    monochrome: {
        name: 'Однотонные',
        description: 'Однотонные силуэты в темно-красном цвете',
        icons: {
            'green_opportunity': '🤖', // Android robot
            'pink_expense': '🧪', // Flask with plus
            'orange_charity': '💻', // Laptop
            'blue_dividend': '🧮', // Calculator
            'purple_business': '📱', // Smartphone
            'yellow_baby': '📷', // Camera
            'red_downsize': '⏱️', // Stopwatch
            'default': '⬤'
        },
        cssClass: 'icon-monochrome'
    },
    outline: {
        name: 'Контурные',
        description: 'Только контуры без заливки',
        icons: {
            'green_opportunity': '○',
            'pink_expense': '□',
            'orange_charity': '♡',
            'blue_dividend': '$',
            'purple_business': '◊',
            'yellow_baby': '△',
            'red_downsize': '▼',
            'default': '⬤'
        },
        cssClass: 'icon-outline'
    },
    minimal: {
        name: 'Минималистичные',
        description: 'Простые геометрические формы',
        icons: {
            'green_opportunity': '●',
            'pink_expense': '■',
            'orange_charity': '♥',
            'blue_dividend': '♦',
            'purple_business': '▲',
            'yellow_baby': '▼',
            'red_downsize': '◄',
            'default': '⬤'
        },
        cssClass: 'icon-minimal'
    }
};

// Функция для получения иконки по типу и стилю
function getIconForType(type, style = 'emoji') {
    const styleConfig = ICON_STYLES[style];
    if (!styleConfig) {
        styleConfig = ICON_STYLES.emoji;
    }
    return styleConfig.icons[type] || styleConfig.icons.default;
}

// Функция для получения CSS класса стиля
function getIconStyleClass(style = 'emoji') {
    const styleConfig = ICON_STYLES[style];
    return styleConfig ? styleConfig.cssClass : '';
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ICON_STYLES, getIconForType, getIconStyleClass };
} else if (typeof window !== 'undefined') {
    window.ICON_STYLES = ICON_STYLES;
    window.getIconForType = getIconForType;
    window.getIconStyleClass = getIconStyleClass;
}
