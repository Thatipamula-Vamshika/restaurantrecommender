"""
CommunalTable - Flask Backend Server
Serves static files and provides REST API endpoints for restaurant data and room management.
"""

from flask import Flask, send_from_directory, jsonify, request, abort
import json
import os
import uuid
import time
import math
import random
import string
from collections import defaultdict

app = Flask(__name__, static_folder='public')

# ─── In-memory room store (replace with Firebase/Redis in production) ───────
ROOMS = {}          # room_code -> room_object
ROOM_TIMEOUT = 3600 # 1 hour


def gen_room_code(n=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))


# ─── Haversine ──────────────────────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


# ─── Static file routes ─────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    # serve files from root directory first, then public/
    if os.path.exists(filename):
        directory = os.path.dirname(filename) or '.'
        basename = os.path.basename(filename)
        return send_from_directory(directory, basename)
    return send_from_directory('public', filename)


# ─── API: Nearby restaurants ─────────────────────────────────────────────────
@app.route('/api/nearby')
def api_nearby():
    try:
        lat = float(request.args.get('lat', 0))
        lon = float(request.args.get('lon', 0))
        radius = float(request.args.get('radius', 50))  # km
        limit = int(request.args.get('limit', 20))
        theme = request.args.get('theme', '')
        q = request.args.get('q', '').lower()

        with open('public/restaurants.json', 'r', encoding='utf-8') as f:
            catalog = json.load(f)

        with open('public/city-defaults.json', 'r', encoding='utf-8') as f:
            city_defaults = json.load(f)

        CITY_COORDS = {
            'Mumbai': [19.076, 72.8777], 'Delhi': [28.6139, 77.209],
            'New Delhi': [28.6139, 77.209], 'Bangalore': [12.9716, 77.5946],
            'Hyderabad': [17.385, 78.4867], 'Chennai': [13.0827, 80.2707],
            'Kolkata': [22.5726, 88.3639], 'Pune': [18.5204, 73.8567],
            'Ahmedabad': [23.0225, 72.5714], 'Jaipur': [26.9124, 75.7873],
            'Lucknow': [26.8467, 80.9462], 'Surat': [21.1702, 72.8311],
        }

        # Find nearest city
        nearest_city = None
        nearest_dist = float('inf')
        for city, coords in CITY_COORDS.items():
            d = haversine_km(lat, lon, coords[0], coords[1])
            if d < nearest_dist:
                nearest_dist = d
                nearest_city = city.lower()

        # Filter by city
        def matches(r):
            city_name = r.get('c', '').lower()
            if nearest_city and nearest_city in city_name:
                return True
            if nearest_city and city_name in nearest_city:
                return True
            return False

        # Theme boost cuisines
        THEME_CUISINES = {
            'romantic': ['Italian', 'Continental', 'Pastas', 'Desserts', 'Mediterranean'],
            'street': ['Fast Food', 'Chaat', 'Snacks', 'Rolls', 'Biryani'],
            'family': ['Thalis', 'South Indian', 'North Indian', 'Sweets', 'Bakery'],
            'cafe': ['Cafe', 'Beverages', 'Bakery', 'Desserts', 'Healthy Food'],
            'budget': ['Fast Food', 'Snacks', 'Thalis', 'Chinese', 'South Indian'],
            'rooftop': ['Continental', 'Italian', 'Beverages', 'Cafe', 'North Indian'],
            'fine': ['Continental', 'Italian', 'Mediterranean', 'Seafood', 'Mughlai'],
        }
        boost_cuisines = set(c.lower() for c in THEME_CUISINES.get(theme, []))

        results = []
        for r in catalog:
            if not matches(r):
                continue
            # text search
            if q:
                searchable = (r.get('n', '') + ' ' + r.get('c', '') + ' ' + ' '.join(r.get('q', []))).lower()
                if q not in searchable:
                    continue

            # boost score
            score = r.get('r', 3.0)
            if boost_cuisines:
                for cuisine in r.get('q', []):
                    if cuisine.lower() in boost_cuisines:
                        score += 0.5
                        break

            results.append({**r, '_score': score})

        # Sort by score descending
        results.sort(key=lambda x: x['_score'], reverse=True)
        results = results[:limit]

        # Remove internal score field
        for r in results:
            r.pop('_score', None)

        return jsonify({'restaurants': results, 'nearest_city': nearest_city, 'count': len(results)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── API: Search restaurants ─────────────────────────────────────────────────
@app.route('/api/search')
def api_search():
    try:
        q = request.args.get('q', '').strip().lower()
        limit = int(request.args.get('limit', 30))

        if not q or len(q) < 2:
            return jsonify({'restaurants': [], 'count': 0})

        with open('public/restaurants.json', 'r', encoding='utf-8') as f:
            catalog = json.load(f)

        results = []
        for r in catalog:
            name = r.get('n', '').lower()
            city = r.get('c', '').lower()
            cuisines = ' '.join(r.get('q', [])).lower()
            if q in name or q in city or q in cuisines:
                results.append(r)

        results.sort(key=lambda x: (
            -int(request.args.get('q', '').lower() in x.get('n', '').lower()),
            -x.get('r', 0)
        ))

        return jsonify({'restaurants': results[:limit], 'count': len(results)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── API: Room management ────────────────────────────────────────────────────
@app.route('/api/room/create', methods=['POST'])
def create_room():
    data = request.get_json(force=True, silent=True) or {}
    people_count = int(data.get('people', 2))
    host_name = data.get('hostName', 'Host')

    code = gen_room_code()
    while code in ROOMS:
        code = gen_room_code()

    room = {
        'code': code,
        'hostName': host_name,
        'peopleCount': people_count,
        'status': 'waiting',   # waiting | browsing | voting | finished
        'members': [],
        'restaurants': [],
        'votes': {},
        'finalPick': None,
        'createdAt': time.time(),
        'updatedAt': time.time(),
        'chat': [],
    }
    ROOMS[code] = room

    return jsonify({
        'code': code,
        'shareUrl': f"{request.host_url}?room={code}",
        'room': _safe_room(room),
    })


@app.route('/api/room/<code>', methods=['GET'])
def get_room(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    return jsonify({'room': _safe_room(room)})


@app.route('/api/room/<code>/join', methods=['POST'])
def join_room(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    member_id = str(uuid.uuid4())[:8]
    name = data.get('name', f'Guest {len(room["members"]) + 1}')

    member = {'id': member_id, 'name': name, 'joinedAt': time.time()}
    room['members'].append(member)
    room['updatedAt'] = time.time()

    return jsonify({'memberId': member_id, 'room': _safe_room(room)})


@app.route('/api/room/<code>/vote', methods=['POST'])
def vote_restaurant(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    restaurant_id = str(data.get('restaurantId', ''))
    member_id = data.get('memberId', '')
    vote = data.get('vote', 0)  # 1=like, -1=dislike, 0=skip

    if restaurant_id not in room['votes']:
        room['votes'][restaurant_id] = {}
    room['votes'][restaurant_id][member_id] = vote
    room['updatedAt'] = time.time()

    return jsonify({'votes': room['votes'].get(restaurant_id, {}), 'room': _safe_room(room)})


@app.route('/api/room/<code>/restaurants', methods=['POST'])
def set_room_restaurants(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    room['restaurants'] = data.get('restaurants', [])
    room['status'] = 'browsing'
    room['updatedAt'] = time.time()

    return jsonify({'room': _safe_room(room)})


@app.route('/api/room/<code>/finalize', methods=['POST'])
def finalize_room(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    room['finalPick'] = data.get('restaurantId')
    room['status'] = 'finished'
    room['updatedAt'] = time.time()

    return jsonify({'room': _safe_room(room)})


@app.route('/api/room/<code>/status', methods=['POST'])
def update_room_status(code):
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    new_status = data.get('status')
    if new_status in ('waiting', 'browsing', 'voting', 'finished'):
        room['status'] = new_status
        room['updatedAt'] = time.time()

    return jsonify({'room': _safe_room(room)})


@app.route('/api/room/<code>/poll', methods=['GET'])
def poll_room(code):
    """Long-poll style endpoint: returns room state, optionally waiting for changes."""
    room = ROOMS.get(code.upper())
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    since = float(request.args.get('since', 0))
    # Simple: if nothing changed since 'since', wait briefly (simulate real-time)
    deadline = time.time() + 8  # wait up to 8s
    while time.time() < deadline:
        if room['updatedAt'] > since:
            return jsonify({'room': _safe_room(room), 'updated': True})
        time.sleep(0.5)
    return jsonify({'room': _safe_room(room), 'updated': False})


def _safe_room(room):
    """Return a serializable copy of the room."""
    return {k: v for k, v in room.items()}


# ─── Cleanup stale rooms periodically ────────────────────────────────────────
def cleanup_rooms():
    now = time.time()
    stale = [c for c, r in ROOMS.items() if now - r['createdAt'] > ROOM_TIMEOUT]
    for c in stale:
        del ROOMS[c]


@app.before_request
def before_request():
    if random.random() < 0.01:  # 1% chance on each request
        cleanup_rooms()


if __name__ == '__main__':
    print("🍽️  CommunalTable server starting...")
    print("   Open http://localhost:5000 in your browser")
    app.run(debug=True, host='0.0.0.0', port=5000)