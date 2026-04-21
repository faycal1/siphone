from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import re

app = Flask(__name__)
CORS(app)

# Get the absolute path of the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Base directory is one level up from config-api
BASE_DIR = os.path.dirname(SCRIPT_DIR)

CONFIG_DIR = os.path.join(BASE_DIR, "config")
PJSIP_CONF = os.path.join(CONFIG_DIR, "pjsip.conf")
EXTENSIONS_CONF = os.path.join(CONFIG_DIR, "extensions.conf")

def extension_exists(ext):
    if not os.path.exists(PJSIP_CONF):
        return False
    with open(PJSIP_CONF, "r") as f:
        content = f.read()
        # Check for [ext] section
        return f"[{ext}]" in content

@app.route('/add-extension', methods=['POST'])
def add_extension():
    data = request.json
    ext = data.get('extension')
    password = data.get('password')
    name = data.get('name', f"Agent {ext}")

    if not ext or not password:
        return jsonify({"error": "Extension and password are required"}), 400

    if extension_exists(ext):
        return jsonify({"error": f"Extension {ext} already exists"}), 400

    try:
        # 1. Update pjsip.conf
        pjsip_entry = f"""
# --- Added by API ---
[{ext}]
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=15

[{ext}]
type=auth
auth_type=userpass
username={ext}
password={password}

[{ext}]
type=endpoint
context=internal
disallow=all
allow=opus
allow=ulaw
allow=g722
auth={ext}
aors={ext}
callerid={name} <{ext}>
transport=transport-ws
webrtc=yes
ice_support=yes
use_avpf=yes
media_encryption=dtls
dtls_verify=no
dtls_setup=actpass
dtls_auto_generate_cert=yes
rtp_symmetric=yes
rewrite_contact=yes
force_rport=yes
"""
        with open(PJSIP_CONF, "a") as f:
            f.write(pjsip_entry)

        # 2. Update extensions.conf
        # We'll try to insert it after the [internal] header
        with open(EXTENSIONS_CONF, "r") as f:
            lines = f.readlines()
        
        new_lines = []
        found_internal = False
        inserted = False
        for line in lines:
            new_lines.append(line)
            if "[internal]" in line and not inserted:
                new_lines.append(f"exten => {ext},1,Dial(PJSIP/{ext},30)\n")
                inserted = True
        
        if not inserted:
            # If [internal] not found, just append
            new_lines.append(f"\n[internal]\nexten => {ext},1,Dial(PJSIP/{ext},30)\n")

        with open(EXTENSIONS_CONF, "w") as f:
            f.writelines(new_lines)

        # 3. Reload Asterisk
        subprocess.run(["docker", "exec", "asterisk", "asterisk", "-rx", "pjsip reload"], check=True)
        subprocess.run(["docker", "exec", "asterisk", "asterisk", "-rx", "dialplan reload"], check=True)

        return jsonify({"message": f"Extension {ext} added and Asterisk reloaded successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/registrations', methods=['GET'])
def get_registrations():
    try:
        # Execute Asterisk CLI command
        result = subprocess.run(
            ["docker", "exec", "asterisk", "asterisk", "-rx", "pjsip show registrations"],
            capture_output=True, text=True, check=True
        )
        
        output = result.stdout
        registrations = []
        
        if "No objects found" in output:
            return jsonify([]), 200

        # Regex to match the registration lines
        # Example line:  mytrunk/sip:sip.example.com:5060     mytrunk_auth      Registered
        lines = output.splitlines()
        for line in lines:
            line = line.strip()
            # Skip headers and empty lines
            if not line or "Registration/ServerURI" in line or "===" in line or "Objects found" in line:
                continue
            
            # Simple column parsing (split by whitespace)
            parts = re.split(r'\s{2,}', line)
            if len(parts) >= 3:
                registrations.append({
                    "resource": parts[0],
                    "server_uri": parts[1],
                    "status": parts[2]
                })

        return jsonify(registrations), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
