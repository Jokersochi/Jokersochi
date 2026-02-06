import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        page = await context.new_page()
        await page.goto('https://cursor.com/agents?selectedBcId=bc-a99878f6-7525-4db6-bf6a-991bcd8074cb', wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(5000)
        text = await page.inner_text('body')
        print(text)
        await browser.close()

asyncio.run(main())
