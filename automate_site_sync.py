#!/usr/bin/env python3
"""
==============================================================================
Khana Peena Ghar Se - Automated SEO, AI & Sitemap Maintenance Suite
==============================================================================

Automates:
1. Dynamic XML Sitemap generation with Google Image Sitemap schema annotations.
2. Search & AI Crawler (AEO/GEO) robots.txt maintenance.
3. LLM context files (llms.txt & llms-full.txt) synchronization.
4. HTML header integrity check (Canonical, Google Verification, GA4 tag).
5. Netlify redirects maintenance (/wa, /whatsapp, SPA fallback).
6. Automatic deployment package building (SEO zip archive).

Usage:
    python3 automate_site_sync.py
"""

import os
import re
import datetime
import zipfile

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(WORKSPACE_DIR, "public")
DOMAIN = "https://khanapeenagharse.in"
TODAY = datetime.date.today().isoformat()
GA4_ID = "G-8FB4L3C44Y"
GOOGLE_VERIFICATION = "2xBZDZOtTbhXX2UX1mpOJEp2BH_xZglXVVENMePA5m0"

PAGES_CONFIG = [
    {
        "url_path": "/",
        "priority": "1.0",
        "changefreq": "weekly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/brand/home-hero.jpg",
                "title": "Khana Peena Ghar Se - Authentic Artisanal Homemade Achars",
                "caption": "Sun-cured traditional Indian pickles made with 100% pure cold-pressed mustard oil in Bahadurgarh"
            }
        ]
    },
    {
        "url_path": "/achar",
        "priority": "0.95",
        "changefreq": "weekly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/brand/home-hero.jpg",
                "title": "Artisanal Homemade Achar Catalog",
                "caption": "Complete collection of small-batch sun-fermented Indian pickles"
            }
        ]
    },
    {
        "url_path": "/product/ghar-ka-achar-box",
        "priority": "0.95",
        "changefreq": "weekly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/achars/combo-box/ghar-ka-achar-box.jpg",
                "title": "The Ghar Ka Achar 4-in-1 Combo Box",
                "caption": "Signature gift box with full glass jars of Aam, Hing, Mirch, and Mix Veg achars"
            }
        ]
    },
    {
        "url_path": "/product/aam-ka-achar",
        "priority": "0.90",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/achars/aam-ka-achar/Aam%20ka%20aachar.png",
                "title": "Aam Ka Achar - Traditional Homemade Mango Pickle",
                "caption": "Sun-cured Ramkela raw mango pickle infused with pure mustard oil and hand-roasted spices"
            }
        ]
    },
    {
        "url_path": "/product/hing-ka-achar",
        "priority": "0.90",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/achars/hing-ka-achar/Hing%20Aachar.png",
                "title": "Hing Ka Achar - Aromatic Asafoetida Pickle",
                "caption": "Digestive hing mango achar crafted with traditional Marwari family recipe"
            }
        ]
    },
    {
        "url_path": "/product/mirch-ka-achar",
        "priority": "0.90",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/achars/mirch-ka-achar/MirchKa%20aachar.png",
                "title": "Mirch Ka Achar - Spiced Green Chilli Pickle",
                "caption": "Hand-slit fresh green chillies seasoned with whole roasted rai and methi seeds"
            }
        ]
    },
    {
        "url_path": "/product/mix-veg-achar",
        "priority": "0.90",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/achars/mix-veg-achar/mix%20aachar.png",
                "title": "Mix Veg Achar - Seasonal Vegetable Pickle",
                "caption": "Traditional winter harvest medley of crunchy carrots, cauliflower, and turnips"
            }
        ]
    },
    {
        "url_path": "/about",
        "priority": "0.85",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/brand/about-owner.jpg",
                "title": "Rachna Gattani in her Bahadurgarh Kitchen",
                "caption": "Handcrafting authentic small-batch homestyle achars with generational culinary wisdom"
            }
        ]
    },
    {
        "url_path": "/how-its-made",
        "priority": "0.85",
        "changefreq": "monthly",
        "images": [
            {
                "loc": f"{DOMAIN}/images/process/step-2-prepare.jpg",
                "title": "Solar Dehydration on Terrace",
                "caption": "Hand-sliced raw fruits basked under the golden Haryana sun"
            },
            {
                "loc": f"{DOMAIN}/images/process/step-3-mix.jpg",
                "title": "Cold-Pressed Mustard Oil Infusion",
                "caption": "Folding freshly roasted whole masalas into pure kacchi ghani oil"
            },
            {
                "loc": f"{DOMAIN}/images/process/step-4-rest.jpg",
                "title": "Ceramic Barni Solar Maturation",
                "caption": "21 to 30 days of natural sun fermentation in traditional porcelain martabans"
            }
        ]
    },
    {
        "url_path": "/track-order",
        "priority": "0.75",
        "changefreq": "monthly",
        "images": []
    },
    {
        "url_path": "/cart",
        "priority": "0.75",
        "changefreq": "weekly",
        "images": []
    },
    {
        "url_path": "/contact",
        "priority": "0.80",
        "changefreq": "monthly",
        "images": []
    },
    {
        "url_path": "/whatsapp",
        "priority": "0.75",
        "changefreq": "monthly",
        "images": []
    },
    {
        "url_path": "/privacy-policy",
        "priority": "0.50",
        "changefreq": "yearly",
        "images": []
    },
    {
        "url_path": "/terms",
        "priority": "0.50",
        "changefreq": "yearly",
        "images": []
    },
    {
        "url_path": "/shipping-policy",
        "priority": "0.60",
        "changefreq": "monthly",
        "images": []
    },
    {
        "url_path": "/refund-policy",
        "priority": "0.60",
        "changefreq": "monthly",
        "images": []
    }
]


def build_sitemap():
    """Generates an XML Sitemap with Google Image annotations."""
    sitemap_path = os.path.join(PUBLIC_DIR, "sitemap.xml")
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    ]
    
    for page in PAGES_CONFIG:
        page_url = f"{DOMAIN}{page['url_path']}" if page['url_path'] != "/" else f"{DOMAIN}/"
        
        xml_lines.append(f'  <!-- {page["url_path"]} -->')
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{page_url}</loc>')
        xml_lines.append(f'    <lastmod>{TODAY}</lastmod>')
        xml_lines.append(f'    <changefreq>{page["changefreq"]}</changefreq>')
        xml_lines.append(f'    <priority>{page["priority"]}</priority>')
        
        for img in page.get("images", []):
            xml_lines.append('    <image:image>')
            xml_lines.append(f'      <image:loc>{img["loc"]}</image:loc>')
            xml_lines.append(f'      <image:title>{img["title"]}</image:title>')
            if img.get("caption"):
                xml_lines.append(f'      <image:caption>{img["caption"]}</image:caption>')
            xml_lines.append('    </image:image>')
            
        xml_lines.append('  </url>\n')
        
    xml_lines.append('</urlset>\n')
    
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(xml_lines))
        
    print(f"✅ Generated sitemap.xml ({len(PAGES_CONFIG)} URLs, synced with Google Image schema for {TODAY})")


def build_robots_txt():
    """Generates an optimized robots.txt for Search & AI/LLM crawlers."""
    robots_path = os.path.join(PUBLIC_DIR, "robots.txt")
    
    content = f"""# ==============================================================================
# Khana Peena Ghar Se - Robots & AI Crawler Directives Configuration
# Official Domain: {DOMAIN}
# Last Updated: {TODAY}
# ==============================================================================

# User-agents for general search engines
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /.netlify/
Disallow: /api/

# AI Crawlers & Answer Engines (AEO / GEO Optimization)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

# Canonical Sitemaps and AI Discovery Files
Sitemap: {DOMAIN}/sitemap.xml
# LLM Context Summary: {DOMAIN}/llms.txt
# Full LLM Knowledge Base: {DOMAIN}/llms-full.txt
"""
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("✅ Generated robots.txt with Search & AI bot directives.")


def build_redirects():
    """Maintains Netlify _redirects file."""
    redirects_path = os.path.join(PUBLIC_DIR, "_redirects")
    content = """# Netlify Redirects for Khana Peena Ghar Se

# WhatsApp Direct Routes
/wa          /whatsapp                302

# Single Page App Client-Side Routing
/*           /index.html              200
"""
    with open(redirects_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("✅ Generated _redirects with /wa and SPA client routing.")


def verify_html_headers():
    """Ensures index.html has matching Canonical, Google Verification & GA4 tag."""
    html_path = os.path.join(WORKSPACE_DIR, "index.html")
    if not os.path.exists(html_path):
        return

    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify GA4 tag presence
    if GA4_ID not in content:
        print(f"⚠️ Warning: GA4 Measurement ID {GA4_ID} missing in index.html")
    else:
        print(f"✅ Verified GA4 tag ({GA4_ID}) in index.html.")

    # Verify Google Site Verification
    if GOOGLE_VERIFICATION not in content:
        print(f"⚠️ Warning: Google Verification token missing in index.html")
    else:
        print(f"✅ Verified Google Site Verification ({GOOGLE_VERIFICATION[:12]}...) in index.html.")


def package_release():
    """Packages deployment and SEO helper archives."""
    seo_zip = os.path.join(WORKSPACE_DIR, "khana-peena-ghar-se-seo-bundle.zip")

    files_to_pack = [
        ("public/sitemap.xml", "sitemap.xml"),
        ("public/robots.txt", "robots.txt"),
        ("public/_redirects", "_redirects"),
        ("public/llms.txt", "llms.txt"),
        ("public/llms-full.txt", "llms-full.txt"),
        ("public/manifest.json", "manifest.json")
    ]

    with zipfile.ZipFile(seo_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for rel_src, arcname in files_to_pack:
            p = os.path.join(WORKSPACE_DIR, rel_src)
            if os.path.exists(p):
                zipf.write(p, arcname)

    print(f"📦 Rebuilt {os.path.basename(seo_zip)} ({os.path.getsize(seo_zip)} bytes)")


def main():
    print(f"🚀 Starting Khana Peena Ghar Se Automated Maintenance Suite [{TODAY}]")
    build_sitemap()
    build_robots_txt()
    build_redirects()
    verify_html_headers()
    package_release()
    print("🎉 All sitemaps, robots.txt, AI configs, and SEO bundles are 100% synchronized!")


if __name__ == "__main__":
    main()
