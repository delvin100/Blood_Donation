import puppeteer from 'puppeteer';

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false, // Run in visual mode
        defaultViewport: null,
        args: ['--start-maximized'] // Open maximized
    });

    const page = await browser.newPage();

    // --- DONOR LOGIN FLOW ---
    console.log('Navigating to Donor Login Page...');
    await page.goto('http://localhost:5173/donor/login', { waitUntil: 'networkidle0' });

    const credentials = {
        username: 'donor5975', // Replace with a valid test user
        password: 'Password@123'
    };

    console.log(`Filling Login Form for ${credentials.username}...`);

    // 1. Username
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', credentials.username, { delay: 30 });

    // 2. Password
    await page.type('input[name="password"]', credentials.password, { delay: 30 });

    // 3. Remember Me (Optional)
    // const rememberMe = await page.$('input[type="checkbox"]');
    // if (rememberMe) await rememberMe.click();

    console.log('Submitting Login...');

    // Click submit button and wait for navigation
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            submitBtn.click()
        ]);
    }

    console.log('Login submitted. Checking if we reached the dashboard...');

    // Verify URL and wait for a dashboard-specific element
    if (page.url().includes('/dashboard')) {
        console.log('SUCCESS: Redirected to Donor Dashboard.');

        // Wait for a key element on the dashboard to confirm it loaded
        try {
            await page.waitForSelector('h1', { timeout: 5000 });
            console.log('Dashboard content loaded successfully.');
        } catch (e) {
            console.log('Warning: Dashboard URL reached, but specific elements not found yet.');
        }
    } else {
        console.log(`CURRENT URL: ${page.url()}`);
        console.log('Note: Ensure the credentials are correct and the server is running.');
    }

    console.log('Test completed. Browser execution paused. Close manually.');
    // Keep the process alive indefinitely so the browser doesn't close
    await new Promise(() => { });
})();
