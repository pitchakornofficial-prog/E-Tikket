"""Read-only regression checks against the actual public proxy and deployed app."""
import json
import sys
import urllib.error
import urllib.request

origin = "https://e-ticket.phatysd.me"
revision = sys.argv[1]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


client = urllib.request.build_opener(NoRedirect())
client.addheaders = [("User-Agent", "Mozilla/5.0")]
with client.open(origin + "/api/health?revision=" + revision, timeout=20) as response:
    health = json.load(response)
    assert health == {"status": "ok", "revision": revision}, health
for path in ["/", "/login", "/news", "/api/events", "/api/articles"]:
    with client.open(origin + path, timeout=20) as response:
        assert response.status == 200, path
for path, callback in [
    ("/admin", "%2Fadmin"),
    ("/organizer", "%2Forganizer"),
    ("/admin/events?check=1", "%2Fadmin%2Fevents%3Fcheck%3D1"),
]:
    try:
        client.open(origin + path, timeout=20)
    except urllib.error.HTTPError as response:
        assert response.code == 307, (path, response.code)
        assert response.headers["Location"] == origin + "/login?callbackUrl=" + callback
    else:
        raise AssertionError("Expected login redirect for " + path)
print("Public revision, pages, database health and login redirects passed")
