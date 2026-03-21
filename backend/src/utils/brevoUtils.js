const https = require('https');

const sendEmail = async (options) => {
    const data = JSON.stringify({
        sender: {
            name: process.env.BREVO_SENDER_NAME || 'eBloodBank',
            email: process.env.BREVO_SENDER_EMAIL || 'ebloodbankofficial@gmail.com'
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html
    });

    const config = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(config, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`Brevo API error: ${res.statusCode} - ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(new Error(`Brevo request failed: ${e.message}`)));
        req.write(data);
        req.end();
    });
};

module.exports = sendEmail;
