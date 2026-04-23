
import re

try:
    with open('frontend/index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the main script block (the one with API_URL)
    # It starts with "const API_URL =" and is inside <script> tags
    match = re.search(r'<script>\s*// Dynamic API URL(.*?)</script>', content, re.DOTALL)
    
    if match:
        js_content = match.group(1)
        # Prepend the comment to keep line numbers roughly aligned if needed, or just check syntax
        full_js = "// Dynamic API URL" + js_content
        with open('debug_script.js', 'w', encoding='utf-8') as f_js:
            f_js.write(full_js)
        print("Extracted JS to debug_script.js")
    else:
        print("Could not find the main script block")

except Exception as e:
    print(f"Error: {e}")
