// Конфигурация клеток малого круга игры "Денежный поток"
// 24 клетки с различными типами событий

const SMALL_CIRCLE_CELLS = [
  // 1-6
  {
    id: 1,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 2,
    type: 'pink_expense',
    name: 'Всякая всячина',
    description: 'Клетка с обязательными тратами от 100 до 4000$ на разные нужды (чайник, кофе, машина, ТВ, прочее)',
    color: 'pink',
    action: 'mandatory_expense',
    minCost: 100,
    maxCost: 4000
  },
  {
    id: 3,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 4,
    type: 'orange_charity',
    name: 'Благотворительность',
    description: 'Пожертвовать деньги для получения возможности бросать 2 кубика (10% от дохода игрока, можно отказаться)',
    color: 'orange',
    action: 'charity_donation',
    percentage: 0.1,
    benefit: 'double_dice'
  },
  {
    id: 5,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 6,
    type: 'yellow_payday',
    name: 'PayDay',
    description: 'Получить зарплату',
    color: 'yellow',
    action: 'receive_salary'
  },

  // 7-12
  {
    id: 7,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 8,
    type: 'blue_market',
    name: 'Рынок',
    description: 'Там появляются покупатели на разные активы',
    color: 'blue',
    action: 'market_sale'
  },
  {
    id: 9,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 10,
    type: 'pink_expense',
    name: 'Всякая всячина',
    description: 'Клетка с обязательными тратами от 100 до 4000$ на разные нужды (чайник, кофе, машина, ТВ, прочее)',
    color: 'pink',
    action: 'mandatory_expense',
    minCost: 100,
    maxCost: 4000
  },
  {
    id: 11,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 12,
    type: 'purple_baby',
    name: 'Ребенок',
    description: 'Родился ребенок, увеличиваются ежемесячные расходы',
    color: 'purple',
    action: 'baby_born',
    effect: 'increase_monthly_expenses'
  },

  // 13-18
  {
    id: 13,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 14,
    type: 'yellow_payday',
    name: 'PayDay',
    description: 'Получить зарплату',
    color: 'yellow',
    action: 'receive_salary'
  },
  {
    id: 15,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 16,
    type: 'blue_market',
    name: 'Рынок',
    description: 'Там появляются покупатели на разные активы',
    color: 'blue',
    action: 'market_sale'
  },
  {
    id: 17,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 18,
    type: 'pink_expense',
    name: 'Всякая всячина',
    description: 'Клетка с обязательными тратами от 100 до 4000$ на разные нужды (чайник, кофе, машина, ТВ, прочее)',
    color: 'pink',
    action: 'mandatory_expense',
    minCost: 100,
    maxCost: 4000
  },

  // 19-24
  {
    id: 19,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 20,
    type: 'black_loss',
    name: 'Потеря',
    description: 'Потеря денег (увольнение - оплатите один раз расходы и пропустите 2 хода или 3 раза расходы без пропуска хода). Если нет возможности оплатить можно взять кредит, если нет возможности взять кредит то банкрот и обнуление всех активов и выбор новой профессии',
    color: 'black',
    action: 'job_loss',
    options: [
      { name: 'Оплатить один раз', cost: 'monthly_expenses', skipTurns: 2 },
      { name: 'Оплатить 3 раза', cost: 'monthly_expenses * 3', skipTurns: 0 }
    ],
    bankruptcy: true
  },
  {
    id: 21,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 22,
    type: 'yellow_payday',
    name: 'PayDay',
    description: 'Получить зарплату',
    color: 'yellow',
    action: 'receive_salary'
  },
  {
    id: 23,
    type: 'green_opportunity',
    name: 'Зеленая возможность',
    description: 'Малая / большая (на выбор)',
    color: 'green',
    action: 'choose_opportunity'
  },
  {
    id: 24,
    type: 'blue_market',
    name: 'Рынок',
    description: 'Там появляются покупатели на разные активы',
    color: 'blue',
    action: 'market_sale'
  }
];

// Типы клеток для удобства
const CELL_TYPES = {
  GREEN_OPPORTUNITY: 'green_opportunity',
  PINK_EXPENSE: 'pink_expense',
  ORANGE_CHARITY: 'orange_charity',
  YELLOW_PAYDAY: 'yellow_payday',
  BLUE_MARKET: 'blue_market',
  PURPLE_BABY: 'purple_baby',
  BLACK_LOSS: 'black_loss'
};

// Цвета клеток
const CELL_COLORS = {
  GREEN: 'green',
  PINK: 'pink',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  BLUE: 'blue',
  PURPLE: 'purple',
  BLACK: 'black'
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SMALL_CIRCLE_CELLS,
    CELL_TYPES,
    CELL_COLORS
  };
} else if (typeof window !== 'undefined') {
  window.SMALL_CIRCLE_CELLS = SMALL_CIRCLE_CELLS;
  window.CELL_TYPES = CELL_TYPES;
  window.CELL_COLORS = CELL_COLORS;
}
