from playwright.sync_api import sync_playwright
import time

def verify_map():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app - Log shows it's on port 3000
        print("Navigating to app...")
        try:
            page.goto("http://localhost:3000", timeout=60000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            browser.close()
            return

        # Wait for the map to load.
        # The user mentioned "Initialisation Satellite..." text might appear
        print("Waiting for map initialization...")

        # Wait for the canvas to be present
        try:
            page.wait_for_selector("canvas", timeout=30000)
            print("Canvas found.")
        except:
            print("Canvas not found within timeout.")

        # Wait extra time for textures to load as per user instructions
        # "Si l'écran reste noir plus de 5 secondes, c'est juste le temps que ta connexion télécharge les images"
        print("Waiting 15 seconds for textures...")
        time.sleep(15)

        # Take screenshot
        screenshot_path = "/home/jules/verification/map_screenshot.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_map()
