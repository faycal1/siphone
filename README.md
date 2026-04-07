# Asterisk WebRTC Dashboard & Softphone

A professional, high-fidelity WebRTC softphone workstation integrated with a Dockerized Asterisk PJSIP environment. This project features a modern, glassmorphic Vue 3 dashboard for real-time SIP communication and system monitoring.

---

## 🛠️ System Architecture

- **Asterisk Core**: Running Debian 13 (Trixie) with PJSIP and Secure WebSockets (WSS).
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

### Adding New Numbers/Extensions
If you want to add new dialable numbers (like 103, 104, or new Echo Tests):
1. Open `config/extensions.conf` and scroll to the bottom to the `[internal]` block.
2. Add your routing rule, for example: `exten => 103,1,Dial(PJSIP/103,30)`
3. Reload the Asterisk dialplan to apply the changes immediately:
   ```bash
   docker exec asterisk asterisk -rx "dialplan reload"
   ```
*(Note: If you are adding a physical extension, remember to also create the `[103]` user blocks inside `config/pjsip.conf` and run `docker exec asterisk asterisk -rx "pjsip reload"`).*

---

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

---

## 🛡️ Security Note
The current environment uses `dtls_verify=no` for local development. For production deployments, ensure you replace the certificates in `config/` with trusted CA-signed certificates and update your PJSIP configuration.

---

**Developed with ❤️ by Faycal helped by Ai of course**
