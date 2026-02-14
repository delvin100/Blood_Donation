const pool = require('../config/database');

/**
 * Lightweight ML Utility for Donor Matching
 * Uses a simple Logistic Regression approach to predict match probability.
 */
class MLRankingModel {
    constructor() {
        // Weights for: [distance_km, response_time, total_prior_donations, historical_acceptance_rate]
        this.weights = [-0.05, -0.001, 0.1, 2.0];
        this.bias = 0.5;
    }

    /**
     * Sigmoid activation function
     */
    sigmoid(z) {
        return 1 / (1 + Math.exp(-z));
    }

    /**
     * Predicts success probability for a donor-seeker pair
     * 
     * @param {Object} features - { distance, responseRate, history, recency }
     * @returns {number} Probability (0 to 1)
     */
    predict(features) {
        const { distance, responseRate, history, recency } = features;

        // Linear combination
        let z = this.bias +
            (distance * this.weights[0]) +
            (responseRate * this.weights[3]) +
            (history * this.weights[2]);

        return this.sigmoid(z);
    }

    /**
     * Fetches historical data and updates weights (Simulated Training)
     * In a real system, this would use Gradient Descent.
     */
    async train() {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    donor_id,
                    AVG(CASE WHEN outcome = 'Completed' THEN 1 ELSE 0 END) as success_rate,
                    AVG(distance_km) as avg_dist
                FROM match_outcomes
                GROUP BY donor_id
            `);

            if (rows.length === 0) return;

            // Simple heuristic update: adjust bias based on overall success rate
            const overallSuccess = rows.reduce((acc, row) => acc + parseFloat(row.success_rate), 0) / rows.length;
            this.bias += (overallSuccess - 0.5) * 0.1;

            console.log('ML Model "trained" on historical outcomes.');
        } catch (err) {
            console.error('ML Training error:', err);
        }
    }
}

const model = new MLRankingModel();

/**
 * Get a prediction for a single donor
 */
const getMLMatchProbability = async (donor, seekerContext) => {
    // 1. Calculate features - use a fallback distance of 50km if unknown
    const distance = (donor.distance === null || donor.distance === Infinity) ? 50 : donor.distance;

    // 2. Get donor's historical response rate from DB if available
    // For now, we use a default if no history exists
    const responseRate = donor.total_donations > 0 ? 0.8 : 0.5;
    const history = donor.total_donations || 0;

    return model.predict({
        distance,
        responseRate,
        history
    });
};

module.exports = {
    getMLMatchProbability,
    MLRankingModel: model
};
