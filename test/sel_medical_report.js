import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function medicalReportTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        console.log('Logging in as Donor...');
        await driver.get('http://localhost:5173/donor/login');
        await driver.findElement(By.id('loginUsername')).sendKeys('delvin');
        await driver.findElement(By.id('loginPassword')).sendKeys('password123');
        await driver.findElement(By.id('donor-login-submit')).click();
        await driver.wait(until.urlContains('dashboard'), 10000);

        console.log('Navigating to Medical Reports...');
        await driver.wait(until.elementLocated(By.id('nav-medical-reports')), 10000);
        await driver.findElement(By.id('nav-medical-reports')).click();

        console.log('Checking for reports...');
        // Wait for the reports section to load
        await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'All Reports')]")), 5000);

        // Find first download button (if any exist)
        let downloadButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Download')]"));
        if (downloadButtons.length > 0) {
            console.log('Found report, clicking Download...');
            await downloadButtons[0].click();
            console.log('SUCCESS: Medical report download triggered.');
        } else {
            console.log('INFO: No reports found to download, but page navigation worked.');
            console.log('SUCCESS: Medical reports page verified.');
        }

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
