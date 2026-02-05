import puppeteer from 'puppeteer';

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false, // Run in visual mode
        defaultViewport: null,
        args: ['--start-maximized'] // Open maximized
    });

    const page = await browser.newPage();
                
    // --- REGISTRATION FLOW ONLY ---
    console.log('Navigating to Registration Page...');
    await page.goto('http://localhost:5173/organization/register', { waitUntil: 'networkidle0' });

    // Generate random user for this run
    const randomId = Math.floor(Math.random() * 10000);
    const testUser = {
        name: `Auto Test Org ${randomId}`,
        email: `autotest${randomId}@example.com`,
        phone: '9876543210',
        license: `LIC-${randomId}`,
        type: 'Blood Bank',
        state: 'Test State',
        district: 'Test District',
        city: 'Test City',
        address: '123 Automation Blvd, Tech Park',
        password: 'Password@123'
    };

    console.log(`Filling Registration Form for ${testUser.name}...`);

    // 1. Facility Type (Select)
    await page.waitForSelector('select[name="type"]');
    await page.select('select[name="type"]', testUser.type);

    // 2. License ID
    await page.type('input[name="license_number"]', testUser.license, { delay: 30 });

    // 3. Name
    await page.type('input[name="name"]', testUser.name, { delay: 30 });

    // 4. Email
    await page.type('input[name="email"]', testUser.email, { delay: 30 });

    // 5. Phone
    await page.type('input[name="phone"]', testUser.phone, { delay: 30 });

    // 6. Address Fields
    await page.type('input[name="state"]', testUser.state, { delay: 30 });
    await page.type('input[name="district"]', testUser.district, { delay: 30 });
    await page.type('input[name="city"]', testUser.city, { delay: 30 });
    await page.type('textarea[name="address"]', testUser.address, { delay: 30 });

    // 7. Password
    await page.type('input[name="password"]', testUser.password, { delay: 30 });
    await page.type('input[name="confirm_password"]', testUser.password, { delay: 30 });

    console.log('Submitting Registration...');

    // Click submit button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
        await submitBtn.click();
    }

    console.log('Registration submitted. Waiting for navigation/redirect...');

    // Wait for a few seconds to let the user see the result or redirection
    await new Promise(r => setTimeout(r, 10000));

    console.log('Test completed. Browser execution paused. Close manually.');
    // Keep the process alive indefinitely so the browser doesn't close
    await new Promise(() => { });
})();
