import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function orgRegisterTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        console.log('Navigating to Organization Registration...');
        await driver.get('http://localhost:5173/organization/register');

        // Fill Identity
        console.log('Filling facility details...');
        await driver.findElement(By.name('type')).sendKeys('Hospital');
        await driver.findElement(By.name('license_number')).sendKeys('LIC-JS-123');
        await driver.findElement(By.name('name')).sendKeys('JS Test Medical Center');
        await driver.findElement(By.name('email')).sendKeys('test@jsmedical.org');
        await driver.findElement(By.name('phone')).sendKeys('9876543210');

        // Regional & Auth
        await driver.findElement(By.name('state')).sendKeys('Kerala');
        await driver.findElement(By.name('district')).sendKeys('Kottayam');
        await driver.findElement(By.name('city')).sendKeys('Kottayam');
        await driver.findElement(By.name('address')).sendKeys('JS Testing Road, Kottayam');
        await driver.findElement(By.name('password')).sendKeys('Password@123');
        await driver.findElement(By.name('confirm_password')).sendKeys('Password@123');

        // Submit
        console.log('Submitting registration...');
        await driver.findElement(By.id('org-register-button')).click();

        await driver.wait(until.urlContains('dashboard'), 10000);
        console.log('SUCCESS: Organization registration test complete.');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
