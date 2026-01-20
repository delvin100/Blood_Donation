import puppeteer from 'puppeteer';

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false, // Run in visual mode
        defaultViewport: null,
        args: ['--start-maximized'] // Open maximized
    });

    const page = await browser.newPage();

    // Debugging: Listen for console messages from the browser
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    // --- ORGANIZATION LOGIN FLOW ---
    console.log('Navigating to Organization Login Page...');
    await page.goto('http://localhost:5173/organization/login', { waitUntil: 'networkidle0' });

    const credentials = {
        email: 'autotest8916@example.com', // Replace with a valid test organization email
        password: 'Password@123'
    };

    console.log(`Filling Login Form for ${credentials.email}...`);

    // 1. Email (Corporate Email)
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', credentials.email, { delay: 30 });

    // 2. Authorization Key (Password)
    await page.type('input[name="password"]', credentials.password, { delay: 30 });

    console.log('Submitting Login...');

    // Click "Establish Connection" button and wait for navigation
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
        console.log('Clicking Submit...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
            submitBtn.click()
        ]);
    }

    console.log('Login submitted. Checking if we reached the dashboard...');

    // Final verification of the dashboard
    if (page.url().includes('/organization/dashboard')) {
        console.log('SUCCESS: Redirected to Organization Dashboard.');

        // Wait for a key element on the dashboard to confirm it loaded
        try {
            await page.waitForSelector('h3', { timeout: 8000 });
            console.log('Dashboard content (h3 header) detected.');
            console.log('Verified: Navigation to dashboard completed successfully.');

            // --- TEST MEMBERS TAB ---
            console.log('Navigating to Members Tab...');
            // Wait for any button that contains the word "Members"
            await page.waitForSelector('button', { timeout: 5000 });

            // Try clicking "Our Members" or "Members"
            const clicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const membersBtn = buttons.find(b => b.innerText.includes('Members'));
                if (membersBtn) {
                    membersBtn.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('Clicked Members Tab. Waiting for members list...');
                await new Promise(r => setTimeout(r, 4000));

                const pageContent = await page.content();
                if (pageContent.includes('Failed to fetch members')) {
                    console.error('FAILED: "Failed to fetch members" toast detected.');
                } else if (pageContent.includes('Organization Member List') || pageContent.includes('Joined Date')) {
                    console.log('SUCCESS: Members tab loaded correctly.');
                } else {
                    console.log('Members tab might be empty or still loading.');
                }
            } else {
                console.error('FAILED: Could not find Members tab button.');
            }

        } catch (e) {
            console.log('Warning: Dashboard URL reached, but specific header (h3) not found yet.');
            // Fallback: check for any dashboard indicator
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes('Dashboard') || bodyText.includes('Inventory')) {
                console.log('Dashboard indicators found in body text.');
            }
        }
    } else {
        console.log(`FAILED: Unexpected URL: ${page.url()}`);
        console.log('Possible causes: Wrong credentials, server error, or slow network.');
    }

    console.log('Test execution finished. Keeping browser open for inspection.');
    // Keep the process alive indefinitely so the browser doesn't close
    await new Promise(() => { });
})();
