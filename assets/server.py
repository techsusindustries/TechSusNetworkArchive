import http.server
import socketserver

PORT = 48756

class CORSRequestHandler (http.server.SimpleHTTPRequestHandler):
    def end_headers (self):
        self.send_header('Access-Control-Allow-Origin', 'https://status.techsusindustries.com')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

Handler = CORSRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT} with CORS enabled")
    httpd.serve_forever()

