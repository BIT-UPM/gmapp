# Global GPU Monitor - Deployment Instructions

Follow these steps to deploy the Global GPU Monitor across your cluster.

## 1. Deploy Central Server
Run this on your master node or a dedicated monitoring server.

1. **Build the frontend dashboard (requires Node.js):**
   ```bash
   npm install && npm run build
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements_server.txt
   ```

3. **Start the server:**
   ```bash
   python server.py
   ```
   *The server will run on port 8000 by default and serve the built dashboard from the `dist/` directory.*

## 2. Deploy Agents to Compute Nodes
Run this on every Ubuntu node that has GPUs.

1. **Configure the Agent:**
   Edit `agent.py` and update the `SERVER_URL` to point to your master node's IP address.

2. **Create a systemd service file:**
   Create `/etc/systemd/system/gpu-monitor.service`:
   ```ini
   [Unit]
   Description=GPU Monitoring Agent
   After=network.target

   [Service]
   Type=simple
   User=root
   ExecStart=/usr/bin/python3 /path/to/agent.py
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable gpu-monitor
   sudo systemctl start gpu-monitor
   ```

## 3. Network & Firewall
* Ensure the master node allows incoming TCP traffic on port 8000 (or whichever port you configured).
* If using UFW on Ubuntu: `sudo ufw allow 8000/tcp`
* The agents only make outbound HTTP requests, so no inbound ports need to be opened on the compute nodes.
