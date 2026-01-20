import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });

        const page = await browser.newPage();

        // Forward browser console logs to Node.js terminal
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('error')) {
                console.log('BROWSER LOG:', msg.text());
            }
        });

        console.log('Navigating to Donor Registration Page...');
        await page.goto('http://localhost:5173/donor/register', { waitUntil: 'networkidle2' });

        const randomId = Math.floor(Math.random() * 10000);
        const testUser = {
            username: `donor${randomId}`,
            name: `Auto Test Donor`,
            email: `donor${randomId}@example.com`,
            password: 'Password@123',
            phone: '9876543210',
            dob: '1995-05-15',
            bloodGroup: 'O+',
            gender: 'male',
            state: 'Kerala',
            district: 'Ernakulam',
            city: 'Kochi'
        };

        console.log(`\n--- Phase 1: Initial Account Creation ---`);
        console.log(`Username: ${testUser.username}`);

        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', testUser.username, { delay: 20 });
        await page.type('input[name="name"]', testUser.name, { delay: 20 });
        await page.type('input[name="email"]', testUser.email, { delay: 20 });
        await page.type('input[name="password"]', testUser.password, { delay: 20 });
        await page.type('input[name="confirmPassword"]', testUser.password, { delay: 20 });

        console.log('Clicking "Create account"...');
        await page.click('button[type="submit"]');

        console.log(`\n--- Phase 2: Complete Profile (Step 2/3) ---`);
        // Wait for the modal content to appear
        await page.waitForFunction(() => document.body.innerText.includes('Complete Your Profile'), { timeout: 15000 });
        console.log('Modal detected.');

        // Give time for animations
        await new Promise(r => setTimeout(r, 1500));

        console.log(`Selecting Gender: ${testUser.gender}`);
        await page.waitForSelector('.gender-card');
        await page.evaluate((g) => {
            const cards = Array.from(document.querySelectorAll('.gender-card'));
            const target = cards.find(c => c.innerText.toLowerCase().includes(g));
            if (target) {
                target.click();
            } else {
                console.error('Gender card not found for:', g);
            }
        }, testUser.gender);

        await new Promise(r => setTimeout(r, 500));

        console.log('Entering Phone Number...');
        await page.waitForSelector('input[type="tel"]');
        await page.click('input[type="tel"]');
        // Clear value just in case
        await page.evaluate(() => document.querySelector('input[type="tel"]').value = '');
        await page.type('input[type="tel"]', testUser.phone, { delay: 50 });

        console.log('Entering Date of Birth...');
        await page.waitForSelector('input[type="date"]');
        await page.focus('input[type="date"]');
        // Clear and type
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('15051995', { delay: 50 });

        console.log('Selecting Blood Group...');
        await page.waitForSelector('select');
        await page.select('select', testUser.bloodGroup);

        await new Promise(r => setTimeout(r, 800));

        console.log('Advancing to Location step...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const nextBtn = btns.find(b => b.innerText.includes('Continue to Location'));
            if (nextBtn) {
                nextBtn.click();
            } else {
                console.error('"Continue to Location" button not found.');
            }
        });

        console.log(`\n--- Phase 3: Location Details (Step 3/3) ---`);
        await page.waitForFunction(() => document.body.innerText.includes('Add Your Location'), { timeout: 10000 });
        await new Promise(r => setTimeout(r, 1000));

        console.log(`Selecting State: ${testUser.state}`);
        await page.evaluate((stateName) => {
            const selects = Array.from(document.querySelectorAll('select'));
            const stateSelect = selects.find(s => s.innerText.includes('Select your state') || s.innerText.includes('Andhra Pradesh'));
            if (stateSelect) {
                stateSelect.value = stateName;
                stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.error('State select not found.');
            }
        }, testUser.state);

        console.log('Waiting for District dropdown to load...');
        await page.waitForFunction(() => {
            const selects = Array.from(document.querySelectorAll('select'));
            const distSelect = selects.find(s => s.innerText.includes('Select district'));
            return distSelect && !distSelect.disabled;
        }, { timeout: 10000 });

        console.log(`Selecting District: ${testUser.district}`);
        await page.evaluate((distName) => {
            const selects = Array.from(document.querySelectorAll('select'));
            const distSelect = selects.find(s => s.innerText.includes('Select district'));
            if (distSelect) {
                distSelect.value = distName;
                distSelect.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.error('District select not found.');
            }
        }, testUser.district);

        console.log(`Setting City: ${testUser.city}`);
        const citySelector = 'input[placeholder*="city"]';
        await page.waitForSelector(citySelector);
        const cityInput = await page.$(citySelector);

        await cityInput.click({ clickCount: 3 }); // Select all existing text
        await page.keyboard.press('Backspace');
        await page.keyboard.type(testUser.city, { delay: 60 });

        // Double check via evaluate to be absolutely sure React state is triggered
        await page.evaluate((cityName) => {
            const el = document.querySelector('input[placeholder*="city"]');
            if (el && el.value !== cityName) {
                el.value = cityName;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, testUser.city);

        const finalCityVal = await page.evaluate(el => el.value, cityInput);
        console.log(`Verified City value: "${finalCityVal}"`);

        await new Promise(r => setTimeout(r, 800));

        console.log('Submitting Final Profile...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const completeBtn = btns.find(b => b.innerText.includes('Complete Profile'));
            if (completeBtn) {
                completeBtn.click();
            } else {
                console.error('"Complete Profile" button not found.');
            }
        });

        console.log('\nWaiting for navigation/dashboard...');
        // Wait for potential navigation or success overlay
        await new Promise(r => setTimeout(r, 6000));

        const finalUrl = page.url();
        if (finalUrl.includes('/dashboard')) {
            console.log('SUCCESS: Registration complete. Redirected to Dashboard.');
        } else {
            console.log('FAILED: Still at', finalUrl);
            const errMsg = await page.evaluate(() => {
                const err = document.querySelector('.error, .field-error, .animate-shake');
                return err ? err.innerText : 'No specific error message visible on page.';
            });
            console.log('Error found on page:', errMsg);
        }

        console.log('\nSession kept open for manual inspection.');
        // Don't close browser automatically
        await new Promise(() => { });

    } catch (err) {
        console.error('\nCRITICAL TEST ERROR:', err.message);
        console.log('Stack trace for debugging:', err.stack);
    }
})();
