import urllib.request
import json

try:
    url = "http://127.0.0.1:8000/api/showtimes?movie_id=2&date=2026-05-10"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Showtimes for movie 2 on 2026-05-10: {len(data)}")
        for s in data:
            print(s)
except Exception as e:
    print("Error:", e)
