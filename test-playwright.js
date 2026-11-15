const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    
    // Wait for the reader button to be visible
    await page.waitForSelector('#reader', { timeout: 10000 });
    console.log('Found #reader button');
    
    // Check if handlers are attached by evaluating
    const handlerInfo = await page.evaluate(() => {
      const reader = document.querySelector('#reader');
      return {
        exists: !!reader,
        onclick: reader?.onclick ? 'attached' : 'none',
        classes: reader?.className,
        visible: reader ? window.getComputedStyle(reader).display !== 'none' : false
      };
    });
    console.log('Reader button info:', handlerInfo);
    
    // Try clicking
    await page.click('#reader');
    console.log('Clicked #reader');
    
    // Wait a bit for the fallback
    await page.waitForTimeout(2000);
    
    // Check if we moved to s2
    const s2Visible = await page.evaluate(() => {
      const s2 = document.querySelector('#s2');
      return s2 ? !s2.classList.contains('hide') : false;
    });
    console.log('s2 visible:', s2Visible);
    
    // Check for any errors
    const bodyText = await page.textContent('body');
    console.log('Body text (first 500):', bodyText?.substring(0, 500));
    
  } catch (err) {
    console.error('Test error:', err.message);
  }
  
  await browser.close();
})();
