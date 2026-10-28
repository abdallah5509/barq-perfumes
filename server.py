#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BARQ PARFUMS - Backend Server
Zero-dependency HTTP & REST API server using Python standard library.
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse
import mimetypes
import base64
import time
import uuid

# Ensure utf-8 output on Windows consoles
try:
    if sys.stdout:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(BASE_DIR, "assets", "uploads")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Error] Failed to load {filepath}: {e}")
    return default

def save_json(filepath, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class BarqHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/products":
            products = load_json(PRODUCTS_FILE, [])
            self.send_json(products)
            return

        if path == "/api/settings":
            settings = load_json(SETTINGS_FILE, {})
            self.send_json(settings)
            return

        if path == "/api/orders":
            orders = load_json(ORDERS_FILE, [])
            self.send_json(orders)
            return

        # Default static file handling
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            data = {}

        # 1. Update/Add Products
        if path == "/api/products":
            # If payload is a full array, replace products
            if isinstance(data, list):
                save_json(PRODUCTS_FILE, data)
                self.send_json({"status": "success", "message": "تم تحديث جميع المنتجات", "products": data})
                return
            
            # If single product object, add or update
            products = load_json(PRODUCTS_FILE, [])
            p_id = data.get("id") or f"barq-{int(time.time())}"
            data["id"] = p_id
            
            # check if exists
            exists = False
            for idx, p in enumerate(products):
                if p.get("id") == p_id or (p.get("slug") and p.get("slug") == data.get("slug")):
                    products[idx] = data
                    exists = True
                    break
            if not exists:
                products.insert(0, data)
            
            save_json(PRODUCTS_FILE, products)
            self.send_json({"status": "success", "message": "تم حفظ المنتج بنجاح", "product": data, "products": products})
            return

        # 2. Update Settings
        if path == "/api/settings":
            current = load_json(SETTINGS_FILE, {})
            current.update(data)
            save_json(SETTINGS_FILE, current)
            self.send_json({"status": "success", "message": "تم حفظ الإعدادات بنجاح", "settings": current})
            return

        # 3. Log New Order
        if path == "/api/orders":
            orders = load_json(ORDERS_FILE, [])
            data["id"] = data.get("id") or f"ORD-{int(time.time())}"
            data["created_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
            data["status"] = "new"  # new, processing, shipped, completed, cancelled
            orders.insert(0, data)
            save_json(ORDERS_FILE, orders)
            self.send_json({"status": "success", "message": "تم تسجيل الطلب بنجاح", "order": data})
            return

        # 4. Upload Image (Base64 data url)
        if path == "/api/upload":
            image_data = data.get("image_base64", "")
            filename = data.get("filename", f"perfume_{int(time.time())}.jpg")
            if "," in image_data:
                # strip header data:image/png;base64,...
                image_data = image_data.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(image_data)
                safe_name = f"up_{int(time.time())}_{uuid.uuid4().hex[:6]}.jpg"
                save_path = os.path.join(UPLOADS_DIR, safe_name)
                with open(save_path, "wb") as f:
                    f.write(raw_bytes)
                web_path = f"assets/uploads/{safe_name}"
                self.send_json({"status": "success", "url": web_path})
                return
            except Exception as e:
                self.send_json({"status": "error", "message": str(e)}, status=400)
                return

        self.send_json({"status": "error", "message": "Not Found"}, status=404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/products/"):
            prod_id = path.replace("/api/products/", "").strip()
            products = load_json(PRODUCTS_FILE, [])
            new_products = [p for p in products if str(p.get("id")) != prod_id and str(p.get("slug")) != prod_id]
            save_json(PRODUCTS_FILE, new_products)
            self.send_json({"status": "success", "message": "تم حذف المنتج بنجاح", "products": new_products})
            return

        if path.startswith("/api/orders/"):
            order_id = path.replace("/api/orders/", "").strip()
            orders = load_json(ORDERS_FILE, [])
            new_orders = [o for o in orders if str(o.get("id")) != order_id]
            save_json(ORDERS_FILE, new_orders)
            self.send_json({"status": "success", "message": "تم حذف الطلب", "orders": new_orders})
            return

        self.send_json({"status": "error", "message": "Not Found"}, status=404)

def run_server(port=PORT):
    # Try finding an open port if default is in use
    for p in range(port, port + 10):
        try:
            with socketserver.TCPServer(("", p), BarqHandler) as httpd:
                print(f"==================================================")
                print(f"⚡ متجر عطور BARQ يعمل بنجاح!")
                print(f"🌐 رابط المتجر:  http://localhost:{p}/")
                print(f"⚙️  لوحة التحكم: http://localhost:{p}/admin.html")
                print(f"==================================================")
                print("اضغط Ctrl+C لإيقاف السيرفر...")
                httpd.serve_forever()
                break
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 10048:
                continue
            else:
                raise e

if __name__ == "__main__":
    p = PORT
    if len(sys.argv) > 1:
        try:
            p = int(sys.argv[1])
        except ValueError:
            pass
    run_server(p)
