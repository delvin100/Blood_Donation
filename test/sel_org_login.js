import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function orgLoginTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        console.log('Navigating to Organization Login...');
        await driver.get('http://localhost:5173/organization/login');

        console.log('Entering credentials...');
        await driver.findElement(By.name('email')).sendKeys('admin@gmckottayam.gov.in');
        await driver.findElement(By.name('password')).sendKeys('12345678');

        console.log('Clicking Login button...');
        await driver.findElement(By.id('org-login-button')).click();

        console.log('Waiting for dashboard redirect...');
        await driver.wait(until.urlContains('dashboard'), 10000);
        console.log('SUCCESS: Organization login test complete.');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
