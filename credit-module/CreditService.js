/**
 * Credit Service - Новый модуль для работы с кредитами
 */

class CreditService {
    constructor() {
        console.log('💳 CreditService: Инициализация сервиса кредитов');
        this.creditStep = 1000; // Шаг кредита
        this.minAmount = 1000; // Минимальная сумма
        this.paymentRate = 100; // Платеж за каждые 1000$
    }

    /**
     * Взять кредит
     */
    async takeCredit(room, playerIndex, amount) {
        console.log('💳 CreditService: Взятие кредита', { playerIndex, amount });

        // Валидация
        if (!amount || amount < this.minAmount || amount % this.creditStep !== 0) {
            throw new Error(`Сумма должна быть кратной ${this.creditStep}$`);
        }

        // Инициализируем кредитные данные если не существуют
        if (!room.game_data.credit_data) {
            room.game_data.credit_data = {
                player_credits: new Array(room.players.length).fill(0),
                credit_history: []
            };
        }

        // Проверяем, что у игрока нет текущего кредита
        if (room.game_data.credit_data.player_credits[playerIndex] > 0) {
            throw new Error('У вас уже есть активный кредит');
        }

        // Рассчитываем ежемесячный платеж
        const monthlyPayment = Math.floor(amount / this.creditStep) * this.paymentRate;

        // Обновляем данные
        room.game_data.credit_data.player_credits[playerIndex] = amount;
        
        // Добавляем в историю
        room.game_data.credit_data.credit_history.push({
            player_index: playerIndex,
            type: 'take',
            amount: amount,
            monthly_payment: monthlyPayment,
            timestamp: new Date(),
            description: `Взят кредит на $${amount.toLocaleString()}`
        });

        // Добавляем деньги на баланс
        if (!room.game_data.player_balances) {
            room.game_data.player_balances = new Array(room.players.length).fill(0);
        }
        room.game_data.player_balances[playerIndex] += amount;

        // Добавляем в историю переводов
        if (!room.game_data.transfers_history) {
            room.game_data.transfers_history = [];
        }
        room.game_data.transfers_history.push({
            sender: 'Банк',
            recipient: room.players[playerIndex].name,
            amount: amount,
            timestamp: new Date(),
            sender_index: -1,
            recipient_index: playerIndex,
            type: 'credit',
            description: `Кредит на $${amount.toLocaleString()}`
        });

        console.log('💳 CreditService: Кредит выдан успешно', { 
            new_balance: room.game_data.player_balances[playerIndex],
            credit_amount: amount,
            monthly_payment: monthlyPayment
        });

        return {
            success: true,
            new_balance: room.game_data.player_balances[playerIndex],
            credit_amount: amount,
            monthly_payment: monthlyPayment
        };
    }

    /**
     * Погасить кредит
     */
    async payoffCredit(room, playerIndex, amount) {
        console.log('💳 CreditService: Погашение кредита', { playerIndex, amount });

        if (!room.game_data.credit_data) {
            throw new Error('Нет данных о кредитах');
        }

        const currentCredit = room.game_data.credit_data.player_credits[playerIndex] || 0;
        if (currentCredit <= 0) {
            throw new Error('У вас нет активного кредита');
        }

        const payoffAmount = amount || currentCredit;
        if (payoffAmount > currentCredit) {
            throw new Error('Сумма погашения превышает текущий кредит');
        }

        if (payoffAmount > room.game_data.player_balances[playerIndex]) {
            throw new Error('Недостаточно средств для погашения');
        }

        // Обновляем данные
        room.game_data.credit_data.player_credits[playerIndex] -= payoffAmount;
        
        // Добавляем в историю
        room.game_data.credit_data.credit_history.push({
            player_index: playerIndex,
            type: 'payoff',
            amount: payoffAmount,
            timestamp: new Date(),
            description: `Погашен кредит на $${payoffAmount.toLocaleString()}`
        });

        // Списываем деньги с баланса
        room.game_data.player_balances[playerIndex] -= payoffAmount;

        // Добавляем в историю переводов
        room.game_data.transfers_history.push({
            sender: room.players[playerIndex].name,
            recipient: 'Банк',
            amount: payoffAmount,
            timestamp: new Date(),
            sender_index: playerIndex,
            recipient_index: -1,
            type: 'credit_payoff',
            description: `Погашение кредита на $${payoffAmount.toLocaleString()}`
        });

        console.log('💳 CreditService: Кредит погашен успешно', { 
            new_balance: room.game_data.player_balances[playerIndex],
            remaining_credit: room.game_data.credit_data.player_credits[playerIndex]
        });

        return {
            success: true,
            new_balance: room.game_data.player_balances[playerIndex],
            remaining_credit: room.game_data.credit_data.player_credits[playerIndex],
            paid_amount: payoffAmount
        };
    }

    /**
     * Получить информацию о кредите игрока
     */
    getPlayerCredit(room, playerIndex) {
        if (!room.game_data.credit_data) {
            return {
                current_credit: 0,
                monthly_payment: 0,
                can_take_credit: true
            };
        }

        const currentCredit = room.game_data.credit_data.player_credits[playerIndex] || 0;
        const monthlyPayment = Math.floor(currentCredit / this.creditStep) * this.paymentRate;

        return {
            current_credit: currentCredit,
            monthly_payment: monthlyPayment,
            can_take_credit: currentCredit === 0
        };
    }
}

module.exports = CreditService;
