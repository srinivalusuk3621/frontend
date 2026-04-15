import re
import os

files = [
    r"d:\apache tomcat\apache-tomcat-10.1.53\webapps\xerox\dashboard.html",
    r"d:\apache tomcat\apache-tomcat-10.1.53\webapps\xerox\user-dashboard.html",
    r"d:\apache tomcat\apache-tomcat-10.1.53\webapps\xerox\admin-dashboard.html"
]

for file in files:
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Move navigation logic to top
    nav_pattern = r"(// --- View Navigation & Tab Logic ---.*?\}\);\s*\n\s*\}\);)"
    nav_match = re.search(nav_pattern, content, re.DOTALL)
    
    if nav_match:
        nav_text = nav_match.group(1)
        content = content.replace(nav_text, "")
        
        insert_marker = r"// --- Mobile Sidebar Toggle ---"
        if insert_marker in content:
            content = content.replace(insert_marker, nav_text + "\n\n        " + insert_marker)
        else:
            content = content.replace("<script>", "<script>\n        " + nav_text)
            
    # Wrap pdfjsLib in try block
    pdf_pattern = r"(pdfjsLib\.GlobalWorkerOptions\.workerSrc\s*=\s*'[^']+';)"
    content = re.sub(pdf_pattern, r"try { \1 } catch(e) { console.warn('pdfjsLib missing'); }", content)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement complete.")
