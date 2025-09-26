const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database-mongodb");

class Referral {
    constructor({ 
        _id, 
        referrerId, 
        referredId, 
        bonusAmount = 0,
        status = 'pending',
        createdAt 
    }) {
        this._id = _id ? new ObjectId(_id) : new ObjectId();
        this.referrerId = referrerId;
        this.referredId = referredId;
        this.bonusAmount = bonusAmount;
        this.status = status;
        this.createdAt = createdAt || new Date().toISOString();
    }

    static collection() {
        try {
            return getDb().collection("referrals");
        } catch (error) {
            console.error('Database connection error in ReferralModel:', error);
            throw error;
        }
    }

    async save() {
        try {
            const doc = { 
                ...this, 
                _id: this._id
            };
            await Referral.collection().updateOne(
                { _id: this._id },
                { $set: doc },
                { upsert: true }
            );
            return this;
        } catch (error) {
            console.error('Error saving referral:', error);
            throw error;
        }
    }

    static async createReferral(referralData) {
        try {
            const referral = new Referral({
                ...referralData,
                createdAt: new Date()
            });
            await referral.save();
            return referral;
        } catch (error) {
            console.error('Error creating referral:', error);
            throw error;
        }
    }

    static async getReferralStats(telegramId) {
        try {
            const result = await Referral.collection().aggregate([
                { $match: { referrerId: parseInt(telegramId) } },
                { $group: { 
                    _id: null,
                    totalReferrals: { $sum: 1 },
                    totalBonus: { $sum: '$bonusAmount' },
                    completedBonus: { 
                        $sum: { 
                            $cond: [{ $eq: ['$status', 'completed'] }, '$bonusAmount', 0] 
                        } 
                    },
                    pendingBonus: { 
                        $sum: { 
                            $cond: [{ $eq: ['$status', 'pending'] }, '$bonusAmount', 0] 
                        } 
                    }
                }}
            ]).toArray();

            return result.length > 0 ? result[0] : {
                totalReferrals: 0,
                totalBonus: 0,
                completedBonus: 0,
                pendingBonus: 0
            };
        } catch (error) {
            console.error('Error getting referral stats:', error);
            return {
                totalReferrals: 0,
                totalBonus: 0,
                completedBonus: 0,
                pendingBonus: 0
            };
        }
    }

    static async getReferralList(telegramId, limit = 50) {
        try {
            const referrals = await Referral.collection()
                .find({ referrerId: parseInt(telegramId) })
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            
            // Получаем информацию о рефералах
            const referredIds = referrals.map(r => r.referredId);
            const users = await getDb().collection("users")
                .find({ telegramId: { $in: referredIds } })
                .toArray();
            
            const userMap = {};
            users.forEach(user => {
                userMap[user.telegramId] = user;
            });

            return referrals.map(referral => ({
                ...referral,
                referredUser: userMap[referral.referredId] || null
            }));
        } catch (error) {
            console.error('Error getting referral list:', error);
            return [];
        }
    }

    static async updateReferralStatus(referralId, status) {
        try {
            const result = await Referral.collection().updateOne(
                { _id: new ObjectId(referralId) },
                { $set: { status } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating referral status:', error);
            return false;
        }
    }

    static async getReferralByReferredId(referredId) {
        try {
            const referral = await Referral.collection().findOne({ 
                referredId: parseInt(referredId) 
            });
            return referral ? new Referral(referral) : null;
        } catch (error) {
            console.error('Error getting referral by referred ID:', error);
            return null;
        }
    }
}

module.exports = Referral;
