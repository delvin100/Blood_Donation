import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

(async function donorSearchTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    try {
        console.log('Navigating to Seeker (Donor Search)...');
        await driver.get('http://localhost:5173/seeker');
        await driver.manage().window().maximize();

        // Select Blood Group
        console.log('Selecting Blood Group...');
        let bg = await driver.wait(until.elementLocated(By.id('blood-group-select')), 10000);
        await bg.sendKeys('O+');

        // Select Location
        console.log('Selecting State...');
        let state = await driver.findElement(By.id('state-select'));
        await state.sendKeys('Kerala');

        console.log('Selecting District...');
        let district = await driver.findElement(By.id('district-select'));
        await district.sendKeys('Kottayam');

        console.log('Entering City...');
        await driver.findElement(By.id('city-input')).sendKeys('Kottayam');

        // Search
        console.log('Clicking Search...');
        await driver.findElement(By.id('search-button')).click();

        // Check for results
        console.log('Waiting for results...');
        await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Potential Heroes')]")), 10000);
        console.log('SUCCESS: Donor search results displayed.');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await driver.quit();
    }
})();
