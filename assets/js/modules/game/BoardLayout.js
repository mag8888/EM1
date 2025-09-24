// Простая раскладка клеток для визуализации треков на game.html
// Рисуем 44 клетки по периметру внешнего квадрата и 24 клетки в круглом внутреннем треке

// Загружаем конфигурацию клеток
let SMALL_CIRCLE_CELLS = [];
let BIG_CIRCLE_CELLS = [];

// Сначала проверяем window.SMALL_CIRCLE_CELLS
if (typeof window !== 'undefined' && window.SMALL_CIRCLE_CELLS && window.SMALL_CIRCLE_CELLS.length > 0) {
    console.log('🔍 BoardLayout: Using window.SMALL_CIRCLE_CELLS:', window.SMALL_CIRCLE_CELLS.length);
    SMALL_CIRCLE_CELLS = window.SMALL_CIRCLE_CELLS;
} else {
    console.log('🔍 BoardLayout: Using fallback config for small circle');
    // Fallback конфигурация
    SMALL_CIRCLE_CELLS = [
        { id: 1, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 2, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
        { id: 3, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 4, type: 'orange_charity', name: 'Благотворительность', description: 'Пожертвовать деньги для получения возможности бросать 2 кубика', color: 'orange', icon: '❤️', action: 'charity_donation', percentage: 0.1, benefit: 'double_dice' },
        { id: 5, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 6, type: 'blue_dividend', name: 'Дивиденды', description: 'Получить дивиденды от инвестиций', color: 'blue', icon: '💰', action: 'receive_dividends' },
        { id: 7, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 8, type: 'purple_business', name: 'Бизнес', description: 'Возможность купить или продать бизнес', color: 'purple', icon: '🏪', action: 'business_opportunity' },
        { id: 9, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 10, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
        { id: 11, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 12, type: 'yellow_baby', name: 'Семья', description: 'Рождение ребенка - дополнительные расходы', color: 'yellow', icon: '👶', action: 'family_expense', cost: 5000 },
        { id: 13, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 14, type: 'blue_dividend', name: 'Дивиденды', description: 'Получить дивиденды от инвестиций', color: 'blue', icon: '💰', action: 'receive_dividends' },
        { id: 15, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 16, type: 'purple_business', name: 'Бизнес', description: 'Возможность купить или продать бизнес', color: 'purple', icon: '🏪', action: 'business_opportunity' },
        { id: 17, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 18, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
        { id: 19, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 20, type: 'red_downsize', name: 'Сокращение', description: 'Потеря работы - временное сокращение доходов', color: 'red', icon: '💸', action: 'downsize', cost: 10000 },
        { id: 21, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 22, type: 'blue_dividend', name: 'Дивиденды', description: 'Получить дивиденды от инвестиций', color: 'blue', icon: '💰', action: 'receive_dividends' },
        { id: 23, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
        { id: 24, type: 'purple_business', name: 'Бизнес', description: 'Возможность купить или продать бизнес', color: 'purple', icon: '🏪', action: 'business_opportunity' }
    ];
}

// Загружаем BIG_CIRCLE_CELLS
if (typeof window !== 'undefined' && window.BIG_CIRCLE_CELLS && window.BIG_CIRCLE_CELLS.length > 0) {
    console.log('🔍 BoardLayout: Using window.BIG_CIRCLE_CELLS:', window.BIG_CIRCLE_CELLS.length);
    BIG_CIRCLE_CELLS = window.BIG_CIRCLE_CELLS;
} else {
    console.log('🔍 BoardLayout: BIG_CIRCLE_CELLS not loaded from window');
}

// Загружаем функции иконок
let getIconForType = window.getIconForType || function(cellType, style = 'emoji') {
    const icons = {
        'green_opportunity': '💚',
        'pink_expense': '🛒',
        'blue_opportunity': '💙',
        'yellow_expense': '💛',
        'red_expense': '❤️',
        'purple_opportunity': '💜',
        'orange_charity': '❤️',
        'blue_dividend': '💰',
        'purple_business': '🏪',
        'yellow_baby': '👶',
        'red_downsize': '💸'
    };
    return icons[cellType] || '⬤';
};

let getIconStyleClass = window.getIconStyleClass || function(style = 'emoji') {
    return style === 'monochrome' ? 'icon-monochrome' : '';
};

// Функция для получения иконок большого круга
function getBigCircleIcon(cellType) {
    const icons = {
        'money': '💰',
        'dream': '🌟',
        'business': '🏢',
        'loss': '💸',
        'charity': '❤️'
    };
    return icons[cellType] || '⬤';
}

// Простой поп-ап для клеток
function showSimplePopup(cellData) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    content.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">${cellData.name}</h3>
        <p style="margin: 0 0 15px 0; color: #666; line-height: 1.5;">${cellData.description}</p>
        ${cellData.income ? `<p style="margin: 0 0 10px 0; color: #28a745;"><strong>Доход:</strong> $${cellData.income.toLocaleString()}</p>` : ''}
        ${cellData.cost ? `<p style="margin: 0 0 10px 0; color: #dc3545;"><strong>Стоимость:</strong> $${cellData.cost.toLocaleString()}</p>` : ''}
        <button onclick="this.closest('div').remove()" style="
            margin-top: 20px;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        ">Закрыть</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

console.log('🔍 BoardLayout: Config loaded - SMALL_CIRCLE_CELLS:', SMALL_CIRCLE_CELLS.length, 'getIconForType:', typeof getIconForType, 'getIconStyleClass:', typeof getIconStyleClass);

function createCellElement(index, sizeClass, isInner = false) {
    const el = document.createElement('div');
    el.className = `track-cell ${sizeClass}`;
    el.style.cursor = 'pointer';
    
    const num = document.createElement('div');
    num.className = 'cell-number';
    num.textContent = String(index + 1);
    
    const icon = document.createElement('div');
    icon.className = 'cell-icon';
    
    // Получаем данные клетки и иконку
    let cellData = null;
    let iconText = '⬤';
    let iconClass = '';
    let isSelectedDream = false;
    
    console.log('🔍 BoardLayout: Creating cell', index, 'isInner:', isInner, 'SMALL_CIRCLE_CELLS length:', SMALL_CIRCLE_CELLS.length, 'BIG_CIRCLE_CELLS length:', BIG_CIRCLE_CELLS.length);
    
    if (isInner && index < SMALL_CIRCLE_CELLS.length) {
        // Внутренний круг - используем SMALL_CIRCLE_CELLS
        cellData = SMALL_CIRCLE_CELLS[index];
        iconText = getIconForType ? getIconForType(cellData.type) : cellData.icon;
        
        // Для теста: каждая 3-я клетка использует монохромный стиль
        if (index % 3 === 0) {
            iconClass = 'icon-monochrome';
        } else {
            iconClass = getIconStyleClass ? getIconStyleClass() : '';
        }
        
        // Проверяем, является ли эта клетка выбранной мечтой
        if (window.currentRoom?.currentPlayer?.selectedDream) {
            isSelectedDream = cellData.id === window.currentRoom.currentPlayer.selectedDream;
            console.log('🔍 BoardLayout: Checking dream match:', {
                cellId: cellData.id,
                selectedDream: window.currentRoom.currentPlayer.selectedDream,
                isSelectedDream
            });
        }
        
        console.log('🔍 BoardLayout: Inner cell data:', cellData, 'iconText:', iconText, 'iconClass:', iconClass, 'isSelectedDream:', isSelectedDream);
    } else if (!isInner && index < BIG_CIRCLE_CELLS.length) {
        // Внешний круг - используем BIG_CIRCLE_CELLS
        cellData = BIG_CIRCLE_CELLS[index];
        iconText = getBigCircleIcon(cellData.type);
        iconClass = getIconStyleClass ? getIconStyleClass() : '';
        
        console.log('🔍 BoardLayout: Outer cell data:', cellData, 'iconText:', iconText, 'iconClass:', iconClass);
    }
    
    icon.textContent = iconText;
    if (iconClass) {
        icon.className += ` ${iconClass}`;
    }
    
    // Добавляем сердечко для выбранной мечты
    if (isSelectedDream) {
        const heart = document.createElement('div');
        heart.className = 'dream-heart';
        heart.textContent = '❤️';
        heart.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 16px;
            z-index: 20;
            animation: heartbeat 1.5s ease-in-out infinite;
            filter: drop-shadow(0 2px 4px rgba(255, 0, 0, 0.3));
        `;
        el.appendChild(heart);
        console.log('🔍 BoardLayout: Added heart for selected dream:', cellData.id);
    }
    
    // Добавляем обработчик клика
    el.addEventListener('click', () => {
        if (cellData && window.cellPopup) {
            window.cellPopup.show(cellData);
        } else if (cellData) {
            // Fallback поп-ап если cellPopup не доступен
            showSimplePopup(cellData);
        }
    });
    
    // Hover эффекты теперь обрабатываются через CSS
    
    el.appendChild(num);
    el.appendChild(icon);
    return el;
}

function placeAlongPerimeter(container, total, insetPx, isInner) {
    const size = container.clientWidth; // квадрат
    
    if (isInner) {
        // Для малого круга создаем круглую раскладку
        return placeInCircle(container, total, insetPx);
    } else {
        // Для внешнего трека используем квадратную раскладку
        const step = (size - insetPx * 2) / 11; // 11 сегментов на сторону
        const cellsPerSide = 11; // 11 на сторону, 44 всего с углами
        const positions = [];
        for (let side = 0; side < 4; side++) {
            for (let i = 0; i < cellsPerSide; i++) {
                const idx = side * cellsPerSide + i;
                if (idx >= total) break;
                let x = 0; let y = 0;
                const offset = insetPx;
                if (side === 0) { // top → left→right
                    x = offset + i * step;
                    y = offset;
                } else if (side === 1) { // right side top→bottom
                    x = size - offset;
                    y = offset + i * step;
                } else if (side === 2) { // bottom right→left
                    x = size - offset - i * step;
                    y = size - offset;
                } else { // left side bottom→top
                    x = offset;
                    y = size - offset - i * step;
                }
                positions.push({ x, y });
            }
        }
        return positions.slice(0, total);
    }
}

function placeInCircle(container, total, insetPx) {
    const size = container.clientWidth;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - insetPx * 2) / 2;
    
    const positions = [];
    for (let i = 0; i < total; i++) {
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2; // Начинаем с верха
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.push({ x, y });
    }
    return positions;
}

// Глобальная переменная для хранения информации о комнате
window.currentRoom = null;

function renderTracks(room = null) {
    console.log('🎯 renderTracks called');
    console.log('🔍 BoardLayout: SMALL_CIRCLE_CELLS available:', typeof SMALL_CIRCLE_CELLS, 'length:', SMALL_CIRCLE_CELLS?.length);
    console.log('🔍 BoardLayout: BIG_CIRCLE_CELLS available:', typeof BIG_CIRCLE_CELLS, 'length:', BIG_CIRCLE_CELLS?.length);
    console.log('🔍 BoardLayout: getIconForType available:', typeof getIconForType);
    console.log('🔍 BoardLayout: getIconStyleClass available:', typeof getIconStyleClass);
    
    // Проверяем, загружены ли конфигурации
    if (!SMALL_CIRCLE_CELLS || SMALL_CIRCLE_CELLS.length === 0) {
        console.log('🔍 BoardLayout: Configs not loaded, using fallback');
        // Используем fallback конфигурацию
        SMALL_CIRCLE_CELLS = [
            { id: 1, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 2, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 3, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 4, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 5, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 6, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 7, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 8, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 9, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 10, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 11, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 12, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 13, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 14, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 15, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 16, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 17, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 18, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 19, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 20, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 21, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 22, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 },
            { id: 23, type: 'green_opportunity', name: 'Зеленая возможность', description: 'Малая / большая (на выбор)', color: 'green', icon: '💚', action: 'choose_opportunity' },
            { id: 24, type: 'pink_expense', name: 'Всякая всячина', description: 'Клетка с обязательными тратами от 100 до 4000$', color: 'pink', icon: '🛒', action: 'mandatory_expense', minCost: 100, maxCost: 4000 }
        ];
    }
    
    if (!getIconForType) {
        getIconForType = function(cellType, style = 'emoji') {
            const icons = {
                'green_opportunity': '💚',
                'pink_expense': '🛒',
                'blue_opportunity': '💙',
                'yellow_expense': '💛',
                'red_expense': '❤️',
                'purple_opportunity': '💜'
            };
            return icons[cellType] || '⬤';
        };
    }
    
    if (!getIconStyleClass) {
        getIconStyleClass = function(style = 'emoji') {
            return style === 'monochrome' ? 'icon-monochrome' : '';
        };
    }
    
    // Сохраняем информацию о комнате
    if (room) {
        window.currentRoom = room;
        console.log('🔍 BoardLayout: Room data saved:', {
            currentPlayer: room.currentPlayer,
            selectedDream: room.currentPlayer?.selectedDream
        });
    }
    
    // Конфигурации уже загружены выше с fallback
    
    const outer = document.getElementById('outerTrack');
    const inner = document.getElementById('innerTrack');
    
    console.log('🎯 outerTrack found:', !!outer);
    console.log('🎯 innerTrack found:', !!inner);
    
    if (!outer || !inner) {
        console.log('❌ Track elements not found, retrying in 100ms');
        setTimeout(renderTracks, 100);
        return;
    }

    // Очистим
    outer.innerHTML = '';
    inner.innerHTML = '';

    // Создадим временные абсолютно позиционированные контейнеры
    outer.style.position = 'absolute';
    inner.style.position = 'absolute';

    const outerCount = 44;
    const innerCount = 24; // Малый круг теперь имеет 24 клетки

    // Рассчитать позиции после layout
    // Используем requestAnimationFrame, чтобы размеры были актуальны
    requestAnimationFrame(() => {
        console.log('🎯 Creating track cells...');
        const outerPositions = placeAlongPerimeter(outer.parentElement, outerCount, 18, false);
        const innerPositions = placeInCircle(inner.parentElement, innerCount, 110);

        console.log('🎯 Outer positions:', outerPositions.length);
        console.log('🎯 Inner positions:', innerPositions.length);

        outerPositions.forEach((pos, i) => {
            const el = createCellElement(i, '');
            el.style.position = 'absolute';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            outer.appendChild(el);
        });

        innerPositions.forEach((pos, i) => {
            const el = createCellElement(i, '', true); // isInner = true для иконок
            el.style.position = 'absolute';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            inner.appendChild(el);
        });
        
        console.log('✅ Track cells created');
    });
}

// Экспорт в глобальную область для прямого вызова
if (typeof window !== 'undefined') {
    window.renderTracks = renderTracks;
    
    // Автозапуск, если подгружается напрямую
    window.addEventListener('DOMContentLoaded', () => {
        const hasTracks = document.getElementById('outerTrack') && document.getElementById('innerTrack');
        if (hasTracks) {
            renderTracks();
        }
    });
}


