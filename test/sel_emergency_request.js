import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function emergencyRequestTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        // First log in (required for dashboard access)
        console.log('Logging in to reach dashboard...');
        await driver.get('http://localhost:5173/organization/login');
        await driver.findElement(By.name('email')).sendKeys('maryqueens@gmail.com');
        await driver.findElement(By.name('password')).sendKeys('D@123456');

        // Use the new ID for login button
        await driver.findElement(By.id('org-login-button')).click();
        await driver.wait(until.urlContains('dashboard'), 10000);

        // Open Emergency Tab using nav ID
        console.log('Opening Emergency Request tab...');
        await driver.wait(until.elementLocated(By.id('nav-emergency')), 10000);
        await driver.findElement(By.id('nav-emergency')).click();

        // Fill Request Form
        console.log('Filling Emergency Request form...');
        await driver.wait(until.elementLocated(By.id('emergency-units')), 5000);
        await driver.findElement(By.id('emergency-blood-group')).sendKeys('B+');

        let unitsInput = await driver.findElement(By.id('emergency-units'));
        await unitsInput.clear();
        await unitsInput.sendKeys('3');

        // Post Request using submit button ID
        console.log('Broadcasting request...');
        await driver.findElement(By.id('broadcast-submit')).click();

        console.log('SUCCESS: Emergency blood request posted.');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
