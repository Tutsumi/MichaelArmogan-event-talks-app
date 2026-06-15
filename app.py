import datetime
import os
import threading
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup, Tag
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Thread-safe in-memory cache
cache = {
    'data': None,
    'last_updated': None
}
cache_lock = threading.Lock()
CACHE_DURATION = datetime.timedelta(minutes=15)
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_data = response.content
        
        # Atom namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        entries = root.findall('atom:entry', ns)
        
        parsed_updates = []
        update_counter = 0
        
        for entry in entries:
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            link_elem = entry.find('atom:link[@rel="alternate"]', ns)
            link = link_elem.get('href') if link_elem is not None else FEED_URL
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ''
            
            # Parse the content HTML
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = "Update"
            current_content = []
            
            # Helper to save an update segment
            def save_update(u_type, u_content):
                nonlocal update_counter
                html_str = "".join(str(c) for c in u_content).strip()
                if not html_str:
                    return
                # Extract text for twitter preview
                text_str = BeautifulSoup(html_str, 'html.parser').get_text().strip()
                # Clean up multiple whitespaces and newlines
                text_str = ' '.join(text_str.split())
                
                # Check for specific GCP type mappings
                # Common types are Feature, Changed, Deprecated, Fixed, Beta, Security, etc.
                parsed_updates.append({
                    'id': f"update-{update_counter}",
                    'date': date_str,
                    'type': u_type,
                    'html': html_str,
                    'text': text_str,
                    'link': link
                })
                update_counter += 1

            # Iterate over BS children
            for child in soup.contents:
                if isinstance(child, Tag) and child.name == 'h3':
                    if current_content:
                        save_update(current_type, current_content)
                        current_content = []
                    current_type = child.get_text().strip()
                else:
                    current_content.append(child)
            
            # Save final segment
            if current_content:
                save_update(current_type, current_content)
                
        return parsed_updates, None
    except Exception as e:
        return None, str(e)

def get_release_notes(force_refresh=False):
    global cache
    now = datetime.datetime.now()
    
    with cache_lock:
        if not force_refresh and cache['data'] is not None and cache['last_updated'] is not None:
            if now - cache['last_updated'] < CACHE_DURATION:
                return cache['data'], None
                
        # Cache miss or force refresh
        data, error = fetch_and_parse_feed()
        if error:
            # If we have stale data, return it instead of erroring, but notify the client
            if cache['data'] is not None:
                return cache['data'], f"Failed to refresh feed ({error}). Serving cached data."
            return None, error
            
        cache['data'] = data
        cache['last_updated'] = now
        return data, None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data, error = get_release_notes(force_refresh)
    
    if error and data is None:
        return jsonify({'error': error}), 500
        
    return jsonify({
        'updates': data,
        'warning': error,
        'last_updated': cache['last_updated'].isoformat() if cache['last_updated'] else None
    })

if __name__ == '__main__':
    # Determine port
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
