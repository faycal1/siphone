# Asterisk WebRTC Dashboard & Softphone

A professional, high-fidelity WebRTC softphone workstation integrated with a Dockerized Asterisk PJSIP environment. This project features a modern, glassmorphic Vue 3 dashboard for real-time SIP communication and system monitoring.

---

## 🛠️ System Architecture

- **Asterisk Core**: Running Debian 13 (Trixie) with PJSIP and Secure WebSockets (WSS).
- **Backend API**: Python Flask service for dynamic provisioning (Extensions/Queues).
- **Frontend**: Vue 3 + TypeScript + Vite 8 + Tailwind CSS v4.
- **Protocol**: JsSIP for WebRTC signaling and DTLS v1.3 for media security.

---

## 🚀 Getting Started

### 1. Create and Start the Asterisk Docker Container
The Asterisk server is fully Dockerized and uses a pre-built image (`andrius/asterisk:latest`). Your local `config/` directory is automatically mounted into the container.

To create and start the container, run the following:

```bash
# Navigate to the project root directory
cd asterisk-local

# Pull the image and create/start the container in the background
docker compose up -d

# Verify the container was created and is currently running
docker ps
```
*(Note: The very first time you run `docker compose up -d`, it will take a few moments to download the Asterisk image and build the container).*

### 2. Launch the Softphone Dashboard
The softphone is a modern Vite application located in the `softphone/` directory.

```bash
# Navigate to the softphone directory
cd softphone

# Install dependencies
npm install

# Start the development server
npm run dev
```
The application will be live at: **[http://localhost:5174/](http://localhost:5174/)**

### 3. Start the Management API (Optional but recommended)
The management API allows you to add extensions and manage queues directly from the UI.

```bash
# Install Python dependencies
pip3 install flask flask-cors --break-system-packages

# Start the API server
python3 config-api/server.py
```
The API will run on: **[http://localhost:5000/](http://localhost:5000/)**

### 4. Configure External Connections (Optional)
To use the **CSC360 Demo** preset or other remote servers, you must set up your environment variables.
# Edit .env and configured your remote credentials:
VITE_REMOTE_WS_URL=wss://demo.cscall360.com:8089/ws
VITE_REMOTE_EXTENSION=100100
VITE_REMOTE_PASSWORD=your_secure_password
```
*(Note: Secure WebSockets (WSS) are required for all remote connections).*

---

## ⚙️ Configuration

### SIP Accounts
The Asterisk server is pre-configured with two WebRTC extensions for testing:
- **Extension 101**: Password `101pass`
- **Extension 102**: Password `102pass`

### Dynamic UI Config
You can change the active extension and Asterisk server IP directly in the app:
1. Click the **Gear Icon** in the top navigation panel.
2. Enter your **Extension**, **Password**, and **Asterisk IP**.
3. Click **Apply Config**. Your settings are persisted in `localStorage`.

### 🆕 Adding New Extensions (UI Mode)
You can now add extensions directly from the **Admin Dashboard** in the softphone UI:
1. Navigate to the **Admin Dashboard** tab.
2. Fill in the **Extension**, **Password**, and **Full Name**.
3. Click **Provision**. The system will automatically update the config files and reload Asterisk.

### Manual Mode (Legacy)
If you want to add new dialable numbers manually:
1. Open `config/extensions.conf` and scroll to the bottom to the `[internal]` block.
2. Add your routing rule, for example: `exten => 103,1,Dial(PJSIP/103,30)`
3. Reload the Asterisk dialplan: `docker exec asterisk asterisk -rx "dialplan reload"`

---

## 🌍 External & Demo Presets

The softphone supports two primary operational modes:

### 1. Local Dev
- **Goal**: Full technical transparency.
- **Logging**: Displays high-fidelity debug info including **ICE gathering** and **SDP handshakes**.
- **Server**: Targets your local Dockerized Asterisk instance.

### 2. CSC360 Demo
- **Goal**: Professional, clean presentation.
- **Logging**: Automatically filters out technical noise, showing only business-critical events (Call Live, Accepted, Ended).
- **Server**: Targets the remote demo platform via secure environment variables.

---

## 🔊 Audio Reliability & Warming

To bypass strict browser autoplay policies and ensure 100% audio reliability (especially for auto-answering extensions like `600`):

1. **The "Connect" Phase**: When you click the **Connect** button, the app automatically "warms up" the audio engine and requests microphone permissions early. 
2. **Auto-Unlocking**: This interaction satisfies the browser's security requirements, ensuring that incoming media is never blocked.
3. **Manual Override**: If audio fails due to network jitter, use the **"Force Audio Start"** button in the Call HUD to manually kickstart the stream.

---

## 🎧 Call Queues (ACD)

The system is configured with a **Support Queue** (`support`) that allows multiple callers to wait for the first available agent.

### Using the Support Queue
*   **Queue Number**: `800`
*   **Agents**: Extensions `101`, `102`, `104`, and `105` are pre-assigned as members.
*   **Strategy**: `ringall` (All available agents ring at once).

To test, dial **800** from any registered extension.

### Management Commands
| Command | Description |
|---------|-------------|
| `queue show support` | View live queue status (wait times, agents, calls). |
| `queue show agents` | See which agents are currently logged in/out. |
| `module reload app_queue.so` | Apply changes made to `queues.conf`. |

---

```bash
watch -n 1 'docker exec asterisk asterisk -rx "queue show support"'
watch -n 1 'docker exec asterisk asterisk -rx "queue show agents"'
``` 

## 🔍 Debugging & Monitoring

### Terminal SIP Monitoring (sngrep)
To see real-time SIP packet flows (Registrations, Invites, etc.) inside the container:

```bash
# Must be run as root to access raw network sockets
docker exec -it --user root asterisk sngrep
```

### Asterisk CLI & Call Monitoring
To access the live Asterisk console for event tracking and listing active calls:

```bash
docker exec -it asterisk asterisk -rvv
```

Common monitoring commands inside the CLI:
| Command | Description |
|---------|-------------|
| `pjsip show channels` | **List all active calls** and their status. |
| `pjsip show endpoints` | View registered extensions and their IPs. |
| `core show channels` | Show brief overview of all active channels. |
| `pjsip show registrations` | Check outbound trunk registration status. |

### 📊 Live Terminal Dashboard
To see a **live, auto-refreshing dashboard** of all active calls on your host terminal:

```bash
watch -n 1 'docker exec asterisk asterisk -rx "pjsip show channels"'
watch -n 1 'docker exec asterisk asterisk -rx "pjsip show endpoints"'
watch -n 1 'docker exec asterisk asterisk -rx "pjsip show registrations"'
```

### System Logs Panel
The softphone includes a dedicated, always-visible **System Logs** panel on the right side of the dashboard. This panel tracks:
- WebSocket connection status.
- SIP Registration events.
- Incoming/Outgoing call state transitions.

### 🔢 Dial Pad & DTMF Tones
The softphone includes a functional Dial Pad for sending dial tones (DTMF) during active calls (e.g., navigating IVR menus).

- **How to use**: During an active call, click the **Grid Icon** in the center control panel to open the keypad.
- **Verification**: Tones are sent via **SIP INFO** signaling and are acknowledged by Asterisk in real-time.
- **Debugging**: To see the tones arriving at the server in the Asterisk console:
  ```bash
  docker exec -it asterisk asterisk -rx "pjsip set logger on"
  ```
  Look for `INFO` packets containing `Signal=X`.

---

## 🛠️ Connectivity & NAT Traversal
For external connections, the softphone is pre-configured with Google STUN servers in `useSIP.ts` to ensure flawless ICE negotiation across various network firewalls. 

- **STUN Server**: `stun:stun.l.google.com:19302`
- **Port Handling**: Ensure UDP ports `10000-20000` are open if monitoring a local server behind a firewall.

## 🛡️ Security Note
The current environment uses `dtls_verify=no` for local development. For production deployments, ensure you replace the certificates in `config/` with trusted CA-signed certificates and update your PJSIP configuration.

---