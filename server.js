const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the current directory
app.use(express.static(__dirname));

// Store active monitoring intervals
const monitoringIntervals = new Map();

const pingHost = (host) => {
    return new Promise((resolve) => {
        // Windows uses -n, Linux/macOS uses -c
        const platform = process.platform;
        const cmd = platform === 'win32'
            ? `ping -n 1 -w 1000 ${host}`
            : `ping -c 1 -W 1 ${host}`;

        exec(cmd, (error, stdout) => {
            if (error) {
                resolve(false);
                return;
            }
            // En Windows, a veces no hay error pero el texto indica fallo
            if (platform === 'win32') {
                const unreachable = stdout.includes('inaccesible') ||
                    stdout.includes('unreachable') ||
                    stdout.includes('tiempo de espera agotado') ||
                    stdout.includes('timed out');
                resolve(!unreachable);
            } else {
                resolve(true);
            }
        });
    });
};

io.on('connection', (socket) => {
    console.log('Nueva conexión de cliente Socket.io');
    let sshClient = null;

    // Monitoring devices status
    socket.on('start-monitoring', (devices) => {
        console.log(`Iniciando monitoreo para ${devices.length} dispositivos`);

        // Clear previous interval for this socket if exists
        if (monitoringIntervals.has(socket.id)) {
            clearInterval(monitoringIntervals.get(socket.id));
        }

        const checkStatus = async () => {
            const results = await Promise.all(devices.map(async (dev) => {
                const isOnline = await pingHost(dev.ip);
                return { id: dev.id, status: isOnline ? 'online' : 'offline' };
            }));
            socket.emit('status-updates', results);
        };

        // Initial check
        checkStatus();

        // Set interval for periodic checks (every 10 seconds)
        const interval = setInterval(checkStatus, 10000);
        monitoringIntervals.set(socket.id, interval);
    });

    socket.on('ssh-connect', (config) => {
        console.log(`Intentando conectar SSH a ${config.username}@${config.host}:${config.port}...`);

        if (sshClient) {
            sshClient.end();
        }

        sshClient = new Client();

        sshClient.on('ready', () => {
            console.log('SSH Ready!');
            socket.emit('ssh-ready');
            sshClient.shell((err, stream) => {
                if (err) {
                    console.error('Shell Error:', err);
                    return socket.emit('ssh-error', err.message);
                }

                socket.on('ssh-data', (data) => {
                    if (stream) stream.write(data);
                });

                stream.on('data', (data) => {
                    socket.emit('ssh-data', data.toString());
                });

                stream.on('close', () => {
                    console.log('Stream closed');
                    sshClient.end();
                });
            });
        }).on('error', (err) => {
            console.error('SSH Error:', err);
            socket.emit('ssh-error', err.message);
        }).on('close', () => {
            console.log('SSH connection closed');
            socket.emit('ssh-close');
        }).connect({
            host: config.host,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            readyTimeout: 10000 // 10 seconds timeout
        });
    });

    socket.on('disconnect', () => {
        if (sshClient) sshClient.end();
        if (monitoringIntervals.has(socket.id)) {
            clearInterval(monitoringIntervals.get(socket.id));
            monitoringIntervals.delete(socket.id);
        }
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor AdminPanel ejecutándose en http://localhost:${PORT}`);
});
