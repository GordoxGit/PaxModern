from playwright.sync_api import sync_playwright

def test_home(page):
    print("Navigating to home...")
    page.goto("http://localhost:3000")
    print("Waiting for load...")
    page.wait_for_timeout(5000)
    print("Taking screenshot...")
    page.screenshot(path="verification/home.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_home(page)
        finally:
            browser.close()
