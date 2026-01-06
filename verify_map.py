import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-gl-drawing-for-tests'])
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to app...")
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        try:
            page.goto("http://localhost:3000", timeout=60000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        # Click NOUVELLE PARTIE
        print("Clicking NOUVELLE PARTIE...")
        try:
            page.click("text=NOUVELLE PARTIE", timeout=5000)
        except:
            print("Could not find NOUVELLE PARTIE button.")
            page.screenshot(path="/home/jules/verification/error_start.png")
            return

        print("Waiting for modal...")
        page.wait_for_timeout(1000)

        # Select a country (e.g., France)
        print("Selecting France...")
        try:
            page.click("text=France", timeout=5000)
        except:
             print("Could not find France selection.")
             page.screenshot(path="/home/jules/verification/error_select.png")
             return

        print("Waiting for canvas...")
        try:
            page.wait_for_selector("canvas", timeout=30000)
        except:
            print("Canvas not found.")
            page.screenshot(path="/home/jules/verification/error_canvas.png")
            return

        print("Waiting for rendering (5s)...")
        page.wait_for_timeout(5000)

        print("Taking screenshot (Far)...")
        page.screenshot(path="/home/jules/verification/verification_far.png")

        print("Zooming in...")
        # Zoom in significantly to trigger border visibility (< 8 distance)
        # OrbitControls: scroll UP (negative deltaY) usually zooms IN.

        # Center mouse on canvas
        bbox = page.locator("canvas").bounding_box()
        if bbox:
            page.mouse.move(bbox["x"] + bbox["width"] / 2, bbox["y"] + bbox["height"] / 2)
            # Scroll heavily to zoom in
            page.mouse.wheel(0, -2000)
            page.wait_for_timeout(1000)
            page.mouse.wheel(0, -2000)
            page.wait_for_timeout(1000)
            page.mouse.wheel(0, -2000)
            page.wait_for_timeout(2000)

        print("Taking screenshot (Close)...")
        page.screenshot(path="/home/jules/verification/verification_close.png")

        print("Screenshots saved.")
        browser.close()

if __name__ == "__main__":
    run()
