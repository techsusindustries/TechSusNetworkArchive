import http.server
import socketserver
import json
import urllib.request
import urllib.error
import ssl
import sys

PORT = 6969

CLOUDFLARE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://proxyplayground.com',
    'Referer': 'https://proxyplayground.com/'
}

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'https://status.techsusindustries.com  ')
        http.server.SimpleHTTPRequestHandler.end_headers(self)
    
    def do_POST(self):
        if self.path == '/verify-service':
            content_length = int(self.headers.get('Content-Length', 0))
            try:
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                raw_pwd = request_data.get('password', '')
                # 🔑 CRITICAL: TRIM SERVER-SIDE (defense in depth)
                cleaned_pwd = raw_pwd.strip()
                
                # ===== SAFE DEBUGGING (NO STARS, NO PREVIEWS) =====
                print(f"\n{'='*60}")
                print(f"[🔍 VERIFICATION] Service: adea")
                print(f"Password length (raw): {len(raw_pwd)} chars")
                print(f"Password length (trimmed): {len(cleaned_pwd)} chars")
                if len(raw_pwd) != len(cleaned_pwd):
                    ws_removed = len(raw_pwd) - len(cleaned_pwd)
                    print(f"[💡] TRIM APPLIED: Removed {ws_removed} whitespace character(s)")
                # ===================================================
                
                if not cleaned_pwd or request_data.get('serviceName') != 'adea':
                    print("[❌] REJECTED: Empty password or invalid service")
                    self._send_json_response(200, {'valid': False})
                    return
                
                # Use CLEANED password for API call
                api_payload = json.dumps({
                    'password': cleaned_pwd,  # NEVER raw_pwd
                    'serviceName': 'adea'
                }).encode('utf-8')
                
                req = urllib.request.Request(
                    'https://techsusindustries.com/api/validate-service-password',
                    data=api_payload,
                    method='POST',
                    headers=CLOUDFLARE_HEADERS
                )
                
                try:
                    with urllib.request.urlopen(req, timeout=15) as response:
                        api_response = json.loads(response.read().decode('utf-8'))
                        print(f"[✅ API] Response: valid={api_response.get('valid')}")
                        
                        if api_response.get('valid') == True:
                            print("[🎉] ACCESS GRANTED")
                            self._send_json_response(200, {
                                'valid': True,
                                'embedUrl': 'https://mtvarchive.proxyplayground.com'
                            })
                        else:
                            print("[❌] API rejected credentials")
                            self._send_json_response(200, {'valid': False})
                except urllib.error.HTTPError as e:
                    err_preview = e.read().decode('utf-8', errors='ignore')[:200]
                    print(f"[🔥 CLOUDFLARE BLOCK] HTTP {e.code} | Preview: {err_preview[:50]}...")
                    self._send_json_response(200, {'valid': False, 'debug': f'cf_{e.code}'})
                except Exception as e:
                    print(f"[URLException] {type(e).__name__}: {str(e)[:100]}")
                    self._send_json_response(200, {'valid': False, 'debug': 'conn_err'})
                    
            except Exception as e:
                print(f"[SERVER ERROR] {type(e).__name__}: {str(e)}")
                self._send_json_response(400, {'error': 'invalid_request'})
            return
        
        self.send_response(404)
        self.end_headers()
    
    def _send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

Handler = CORSRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n🚀 Server running on port {PORT}")
    print("✅ CORS headers preserved for status checks")
    print("🛡️  Cloudflare headers ACTIVE | Password trimming ENABLED")
    print("🔍 DEBUG: Only password LENGTH logged (NO content previews)")
    print(f"{'='*60}\n")
    httpd.serve_forever()
