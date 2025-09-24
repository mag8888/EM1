// Простая раскладка клеток для визуализации треков на game.html
// Рисуем 44 клетки по периметру внешнего квадрата и 24 клетки в круглом внутреннем треке

// Иконки для малого круга (24 клетки)
const SMALL_CIRCLE_ICONS = [
    '💚', '🛒', '💚', '❤️', '💚', '💰',  // 1-6
    '💚', '🏪', '💚', '🛒', '💚', '👶',  // 7-12
    '💚', '💰', '💚', '🏪', '💚', '🛒',  // 13-18
    '💚', '💸', '💚', '💰', '💚', '🏪'   // 19-24
];

function createCellElement(index, sizeClass, isInner = false) {
    const el = document.createElement('div');
    el.className = `track-cell ${sizeClass}`;
    const num = document.createElement('div');
    num.className = 'cell-number';
    num.textContent = String(index + 1);
    const icon = document.createElement('div');
    icon.className = 'cell-icon';
    
    // Используем иконки для малого круга
    if (isInner && index < SMALL_CIRCLE_ICONS.length) {
        icon.textContent = SMALL_CIRCLE_ICONS[index];
    } else {
        icon.textContent = '⬤';
    }
    
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

function renderTracks() {
    console.log('🎯 renderTracks called');
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


