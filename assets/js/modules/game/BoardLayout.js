// Простая раскладка клеток для визуализации треков на game.html
// Рисуем 44 клетки по периметру внешнего квадрата и 16 клеток во внутреннем

function createCellElement(index, sizeClass) {
    const el = document.createElement('div');
    el.className = `track-cell ${sizeClass}`;
    const num = document.createElement('div');
    num.className = 'cell-number';
    num.textContent = String(index + 1);
    const icon = document.createElement('div');
    icon.className = 'cell-icon';
    icon.textContent = '⬤';
    el.appendChild(num);
    el.appendChild(icon);
    return el;
}

function placeAlongPerimeter(container, total, insetPx, isInner) {
    const size = container.clientWidth; // квадрат
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

export function renderTracks() {
    const outer = document.getElementById('outerTrack');
    const inner = document.getElementById('innerTrack');
    if (!outer || !inner) return;

    // Очистим
    outer.innerHTML = '';
    inner.innerHTML = '';

    // Создадим временные абсолютно позиционированные контейнеры
    outer.style.position = 'absolute';
    inner.style.position = 'absolute';

    const outerCount = 44;
    const innerCount = 16;

    // Рассчитать позиции после layout
    // Используем requestAnimationFrame, чтобы размеры были актуальны
    requestAnimationFrame(() => {
        const outerPositions = placeAlongPerimeter(outer.parentElement, outerCount, 18, false);
        const innerPositions = placeAlongPerimeter(inner.parentElement, innerCount, 110, true);

        outerPositions.forEach((pos, i) => {
            const el = createCellElement(i, '');
            el.style.position = 'absolute';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            outer.appendChild(el);
        });

        innerPositions.forEach((pos, i) => {
            const el = createCellElement(i, '');
            el.style.position = 'absolute';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            inner.appendChild(el);
        });
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


