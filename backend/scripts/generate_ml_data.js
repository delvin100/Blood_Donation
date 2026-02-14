const pool = require('../src/config/database');

/**
 * Generates synthetic match outcomes for training the ML model.
 * It creates patterns where closer donors and those with better histories
 * are more likely to have 'Completed' outcomes.
 */
async function generateSyntheticData(count = 500) {
    try {
        console.log(`Generating ${count} synthetic match outcomes...`);

        // 1. Get some donor IDs
        const [donors] = await pool.query('SELECT id, city, district FROM donors');
        if (donors.length === 0) {
            console.error('No donors found. Please seed donors first.');
            return;
        }

        const outcomes = ['Accepted', 'Rejected', 'Completed', 'TimedOut'];

        for (let i = 0; i < count; i++) {
            const donor = donors[Math.floor(Math.random() * donors.length)];

            // Generate a random distance (0 - 100km)
            const distance = Math.random() * 100;

            // Simple probability logic for outcome
            // Higher distance = lower probability of completion
            const successProb = Math.max(0.1, 1 - (distance / 120));
            const rand = Math.random();

            let outcome;
            if (rand < successProb * 0.7) {
                outcome = 'Completed';
            } else if (rand < successProb) {
                outcome = 'Accepted';
            } else if (rand < 0.8) {
                outcome = 'Rejected';
            } else {
                outcome = 'TimedOut';
            }

            const responseTime = outcome === 'Completed' || outcome === 'Accepted'
                ? Math.floor(60 + Math.random() * 3600) // 1 min to 1 hour
                : null;

            const suitabilityScore = 40 + Math.random() * 50;

            await pool.query(
                'INSERT INTO match_outcomes (donor_id, seeker_id, suggested_at, outcome, response_time_seconds, suitability_score, distance_km) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [donor.id, null, new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), outcome, responseTime, suitabilityScore, distance]
            );

            if (i % 100 === 0) console.log(`Inserted ${i} records...`);
        }

        console.log('Successfully generated synthetic match data.');
        process.exit(0);
    } catch (err) {
        console.error('Error generating synthetic data:', err);
        process.exit(1);
    }
}

generateSyntheticData();
