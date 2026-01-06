from playwright.sync_api import sync_playwright

def verify_3d_globe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Subscribe to console events
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        try:
            # Navigate to the app
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Click "NOUVELLE PARTIE"
            print("Clicking 'NOUVELLE PARTIE'...")
            page.get_by_role("button", name="NOUVELLE PARTIE").click()

            # Wait for modal content
            print("Waiting for modal...")
            page.wait_for_selector("text=Sélectionnez une puissance souveraine")

            # Select Germany (or the first country in the list)
            # The country buttons contain the country name in a div.
            # We can select by text "Germany" or "Allemagne" depending on the mock data.
            # The mock data uses "Germany" as name and "Allemagne" as name_fr.
            # The UI displays name_fr || name. So "Allemagne".
            print("Selecting country 'Allemagne'...")
            page.get_by_role("button", name="Allemagne").click()

            # Now wait for the game layout and canvas
            print("Waiting for WorldMap canvas...")
            page.wait_for_selector("canvas", timeout=15000)

            # Wait a bit for the 3D scene to render/initialize
            page.wait_for_timeout(3000)

            # Take a screenshot
            page.screenshot(path="verification/globe_screenshot.png")
            print("Screenshot taken successfully")

        except Exception as e:
            print(f"Error: {e}")
            # print body to debug
            print("Current Body HTML:")
            print(page.inner_html("body"))
        finally:
            browser.close()

if __name__ == "__main__":
    verify_3d_globe()
