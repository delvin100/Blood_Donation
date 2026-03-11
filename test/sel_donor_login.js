import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function donorLoginTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        console.log('Navigating to Donor Login...');
        await driver.get('http://localhost:5173/donor/login');
        await driver.manage().window().maximize();

        console.log('Entering credentials...');
        // Note: Replace with actual donor credentials if needed
        await driver.findElement(By.id('loginUsername')).sendKeys('delvin');
        await driver.findElement(By.id('loginPassword')).sendKeys('123456789');

        console.log('Clicking Sign In...');
        await driver.findElement(By.id('donor-login-submit')).click();

        console.log('Waiting for Dashboard...');
        await driver.wait(until.urlContains('dashboard'), 10000);

        console.log('SUCCESS: Donor login successful.');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
