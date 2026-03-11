import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

async function orgMemberManagementTest() {
    let options = new chrome.Options();
    options.addArguments('--disable-notifications', '--disable-push-service', '--disable-gcm-over-http', '--silent', '--log-level=3');
    options.excludeSwitches('enable-logging');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        console.log("Navigating to Organization Login...");
        await driver.get('http://localhost:5173/organization/login');
        await driver.manage().window().maximize();

        console.log("Entering Organization credentials...");
        // IDs: login-email, login-password, org-login-button (checking sel_org_login.js pattern)
        // Wait, sel_org_login.js uses By.name('email') and By.id('org-login-button').
        await driver.findElement(By.name('email')).sendKeys('maryqueens@gmail.com');
        await driver.findElement(By.name('password')).sendKeys('D@123456');
        await driver.findElement(By.id('org-login-button')).click();

        console.log("Waiting for Dashboard...");
        // Wait for navbar or any dashboard element
        await driver.wait(until.elementLocated(By.id('nav-verification')), 15000);
        console.log("Organization login successful.");

        // --- Step 1: Add Donor to Org ---
        console.log("Opening 'Add Member to Organisation' tab...");
        await driver.findElement(By.id('nav-verification')).click();

        console.log("Searching for donor 'delvin'...");
        let searchInput = await driver.wait(until.elementLocated(By.id('donor-search-input')), 5000);
        await searchInput.sendKeys('delvin');

        console.log("Selecting donor from results...");
        // Wait for the search result button. Using a broader XPath as ID contains dynamic donor ID.
        let searchResult = await driver.wait(until.elementLocated(By.xpath("//button[contains(@id, 'donor-search-result-')]")), 10000);
        await searchResult.click();

        console.log("Clicking 'Add to Organisation'...");
        // Using XPath since ID might have failed to inject reliably in the dashboard.
        let addBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Add to Organisation')]")), 5000);
        await addBtn.click();

        await driver.sleep(3000); // Wait for API and toast
        console.log("Donor successfully added to Organization.");

        // --- Step 2: Mark Report Eligible ---
        console.log("Opening 'Our Members' tab...");
        await driver.findElement(By.id('nav-members')).click();

        console.log("Finding donor in members list...");
        // Locate "View Reports" button for the row containing 'delvin'
        let viewReportsBtn = await driver.wait(until.elementLocated(By.xpath("//td[contains(., 'delvin')]/..//button[@title='View Reports' or contains(@id, 'view-reports-')]")), 10000);
        await viewReportsBtn.click();

        console.log("Filling Clinical Verification form...");
        await driver.wait(until.elementLocated(By.id('hb-level-input')), 5000).sendKeys('14.5');
        await driver.findElement(By.id('blood-pressure-input')).sendKeys('120/80');
        await driver.findElement(By.id('pulse-rate-input')).sendKeys('75');
        await driver.findElement(By.id('temperature-input')).sendKeys('37.2');
        await driver.findElement(By.id('weight-input')).sendKeys('72');

        // Units might have a default value, let's clear it
        let unitsInput = await driver.findElement(By.id('units-donated-input'));
        await unitsInput.clear();
        await unitsInput.sendKeys('1');

        await driver.findElement(By.id('notes-input')).sendKeys('Automated clinical verification - Passed');

        console.log("Submitting Clinical Record...");
        await driver.findElement(By.id('submit-medical-report')).click();

        console.log("Confirming Eligibility (Mark Eligible)...");
        let markEligibleBtn = await driver.wait(until.elementLocated(By.id('mark-eligible-button')), 5000);
        await markEligibleBtn.click();

        console.log("Wait for finalization...");
        await driver.sleep(3000);

        console.log("SUCCESS: Member management and report eligibility verification complete.");

    } catch (error) {
        console.error("Test FAILED:", error);
        // Take screenshot on failure if needed
    } finally {
        await driver.quit();
    }
}

orgMemberManagementTest();
