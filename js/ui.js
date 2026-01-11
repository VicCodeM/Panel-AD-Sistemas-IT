const UI = {
    socket: null,

    init: () => {
        UI.registerGlobalListeners();
        UI.setupFormListeners();
        // Initialize Socket.io for real-time monitoring
        if (typeof io !== 'undefined') {
            try {
                // Only attempt to connect if we're not on a file:// protocol
                if (window.location.protocol.startsWith('http')) {
                    UI.socket = io({
                        reconnectionAttempts: 10,
                        timeout: 5000,
                        autoConnect: true // Conectar automáticamente para habilitar modo real
                    });

                    UI.socket.on('status-updates', (updates) => {
                        UI.updateStatusBadges(updates);
                    });

                    UI.socket.on('connect', () => {
                        console.log('✓ Conectado al servidor de monitoreo');
                        const statusEl = document.getElementById('connection-status');
                        if (statusEl) {
                            statusEl.innerHTML = `
                                <span class="badge bg-success text-white border-0" style="font-size: 0.7rem;">
                                    <i class="fas fa-check-circle me-1"></i> SISTEMA ACTIVO
                                </span>
                            `;
                        }
                        UI.startMonitoring();
                    });

                    UI.socket.on('connect_error', () => {
                        console.warn('⚠ Servidor de monitoreo no disponible (Socket.io)');
                        const statusEl = document.getElementById('connection-status');
                        if (statusEl) {
                            statusEl.innerHTML = `
                                <span class="badge bg-warning text-dark border-0 animate-pulse" style="font-size: 0.7rem;">
                                    <i class="fas fa-plug me-1"></i> MODO SIMULACIÓN
                                </span>
                            `;
                        }
                        UI.socket.disconnect();
                    });
                }
            } catch (e) {
                console.warn('Socket.io initialization skipped:', e.message);
            }
        }
    },

    registerGlobalListeners: () => {
        console.log('📡 Registrando listeners globales...');

        document.addEventListener('click', async (e) => {
            const target = e.target;
            console.log('🖱️ Click detectado en:', target.tagName, target.className);

            // Buscar botones usando delegación (Buscamos hacia arriba desde el click)
            const btnSsh = target.closest('.btn-ssh');
            const btnPing = target.closest('.btn-ping');
            const btnWeb = target.closest('.btn-open-web');
            const btnEdit = target.closest('.btn-edit-device');
            const btnDelete = target.closest('.btn-delete-device');
            const btnAdd = target.closest('.btn-add-device');

            if (btnSsh) {
                console.log('⚡ Botón SSH detectado');
                e.preventDefault();
                const deviceId = btnSsh.dataset.id || btnSsh.getAttribute('data-id');
                if (deviceId) UI.openTerminal(deviceId);
            } else if (btnPing) {
                console.log('⚡ Botón Ping detectado');
                e.preventDefault();
                const deviceId = btnPing.dataset.id || btnPing.getAttribute('data-id');
                if (deviceId) UI.pingDevice(deviceId);
            } else if (btnWeb) {
                console.log('⚡ Botón Web detectado');
                e.preventDefault();
                const ip = btnWeb.dataset.ip || btnWeb.getAttribute('data-ip');
                const protocol = btnWeb.dataset.protocol || btnWeb.getAttribute('data-protocol') || 'http';
                const port = btnWeb.dataset.port || btnWeb.getAttribute('data-port') || '80';
                if (ip) {
                    const url = `${protocol}://${ip}${port === '80' || port === '443' ? '' : ':' + port}`;
                    window.open(url, '_blank');
                }
            } else if (btnEdit) {
                console.log('⚡ Botón Editar detectado');
                e.preventDefault();
                const deviceId = btnEdit.dataset.id || btnEdit.getAttribute('data-id');
                if (deviceId) UI.showEditDeviceModal(deviceId);
            } else if (btnDelete) {
                console.log('⚡ Botón Eliminar detectado');
                e.preventDefault();
                const deviceId = btnDelete.dataset.id || btnDelete.getAttribute('data-id');
                if (deviceId) UI.handleDeleteDevice(deviceId);
            } else if (btnAdd) {
                console.log('⚡ Botón Añadir detectado');
                e.preventDefault();
                bootstrap.Modal.getOrCreateInstance(document.getElementById('addDeviceModal')).show();
            }
        });
    },

    setupFormListeners: () => {
        // Add Device Form
        document.getElementById('add-device-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await db.servers.add({
                name: formData.get('name'),
                type: formData.get('type'),
                os: formData.get('os'),
                ip: formData.get('ip'),
                port: parseInt(formData.get('port')),
                username: formData.get('username'),
                protocol: formData.get('protocol'),
                webPort: parseInt(formData.get('webPort')),
                status: 'online'
            });

            if (typeof logAction === 'function') {
                await logAction(Auth.currentUser.id, "Añadir Dispositivo", `Se añadió: ${formData.get('name')}`);
            }

            Swal.fire({
                icon: 'success',
                title: 'Dispositivo Añadido',
                timer: 2000,
                showConfirmButton: false
            });

            bootstrap.Modal.getOrCreateInstance(document.getElementById('addDeviceModal')).hide();
            e.target.reset();
            UI.refreshCurrentSection();
        });

        // Add User Form
        document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await db.users.add({
                    username: formData.get('username'),
                    password: formData.get('password'),
                    role: formData.get('role'),
                    securityQuestion: formData.get('securityQuestion'),
                    securityAnswer: formData.get('securityAnswer')
                });

                if (typeof logAction === 'function' && Auth.currentUser) {
                    await logAction(Auth.currentUser.id, "Añadir Usuario", `Se creó: ${formData.get('username')}`);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Usuario Creado',
                    timer: 2000,
                    showConfirmButton: false
                });

                bootstrap.Modal.getOrCreateInstance(document.getElementById('addUserModal')).hide();
                e.target.reset();
                UI.renderUsers();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'El usuario ya existe.' });
            }
        });

        // Edit Device Form
        document.getElementById('edit-device-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const id = parseInt(formData.get('id'));

            await db.servers.update(id, {
                name: formData.get('name'),
                type: formData.get('type'),
                os: formData.get('os'),
                ip: formData.get('ip'),
                port: parseInt(formData.get('port')),
                username: formData.get('username'),
                protocol: formData.get('protocol'),
                webPort: parseInt(formData.get('webPort'))
            });

            if (typeof logAction === 'function') {
                await logAction(Auth.currentUser.id, "Editar Dispositivo", `Se editó: ${formData.get('name')}`);
            }

            Swal.fire({ icon: 'success', title: 'Cambios Guardados', timer: 2000, showConfirmButton: false });
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editDeviceModal')).hide();
            UI.refreshCurrentSection();
        });
    },

    refreshCurrentSection: () => {
        const activeLink = document.querySelector('[data-section].active');
        if (activeLink) {
            const section = activeLink.getAttribute('data-section');
            switch (section) {
                case 'dashboard': UI.renderDashboard(); break;
                case 'infrastructure': UI.renderInfrastructure(); break;
                case 'users': UI.renderUsers(); break;
                case 'logs': UI.renderLogs(); break;
                case 'settings': UI.renderSettings(); break;
            }
        } else {
            // Default to dashboard if no active section found
            UI.renderDashboard();
        }
        // Refresh monitoring list whenever we refresh a section that might have changed devices
        UI.startMonitoring();
    },

    startMonitoring: async () => {
        if (UI.socket && UI.socket.connected) {
            const devices = await db.servers.toArray();
            const monitoringList = devices.map(d => ({ id: d.id, ip: d.ip }));
            UI.socket.emit('start-monitoring', monitoringList);
        } else {
            // Simulated monitoring if no backend is available
            if (UI.monitoringInterval) clearInterval(UI.monitoringInterval);

            UI.monitoringInterval = setInterval(async () => {
                const devices = await db.servers.toArray();
                const updates = devices.map(d => ({
                    id: d.id,
                    status: Math.random() > 0.1 ? 'online' : 'offline' // 90% online simulation
                }));
                UI.updateStatusBadges(updates);
            }, 10000); // Update every 10 seconds
        }
    },

    updateStatusBadges: async (updates) => {
        updates.forEach(async (update) => {
            // Update database to persist the status
            await db.servers.update(update.id, { status: update.status });

            // Update in dashboard table (if visible)
            const dashboardBadges = document.querySelectorAll(`.badge-status-${update.id}`);
            dashboardBadges.forEach(badge => {
                badge.className = `badge bg-${update.status === 'online' ? 'success' : 'danger'} badge-status-${update.id}`;
                badge.innerText = update.status === 'online' ? 'en línea' : 'desconectado';
            });

            // Update in infrastructure grid (if visible)
            const gridBadges = document.querySelectorAll(`.card-status-${update.id}`);
            gridBadges.forEach(badge => {
                badge.className = `badge rounded-pill bg-${update.status === 'online' ? 'success' : 'danger'} bg-opacity-20 text-${update.status === 'online' ? 'success' : 'danger'} border border-${update.status === 'online' ? 'success' : 'danger'} border-opacity-25 px-3 py-2 card-status-${update.id}`;
                badge.innerHTML = `<i class="fas fa-circle me-1" style="font-size: 0.4rem;"></i>${update.status === 'online' ? 'EN LÍNEA' : 'DESCONECTADO'}`;
            });
        });

        // Update availability percentage in real-time
        const allDevices = await db.servers.toArray();
        const onlineCount = allDevices.filter(d => d.status === 'online').length;
        const totalCount = allDevices.length;
        const availability = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 100;

        const availEl = document.querySelector('.availability-pct');
        if (availEl) {
            availEl.innerText = `${availability}%`;
        }
    },

    getDeviceColorByStatus: (status) => {
        return status === 'online' ? 'success' : 'danger';
    },

    typeText: (elementId, text) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.innerText = '';
        let i = 0;
        const type = () => {
            if (i < text.length) {
                el.innerText += text.charAt(i);
                i++;
                setTimeout(type, 50);
            }
        };
        type();
    },

    renderDashboard: async () => {
        const allDevices = await db.servers.toArray();
        const raspberryCount = allDevices.filter(d => d.type === 'Raspberry Pi').length;
        const serverCount = allDevices.filter(d => d.type === 'Server').length;
        const networkCount = allDevices.filter(d => ['Switch', 'Router', 'Hub'].includes(d.type)).length;

        const onlineCount = allDevices.filter(d => d.status === 'online').length;
        const totalCount = allDevices.length;
        const availability = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 100;

        const recentLogs = await db.logs.orderBy('timestamp').reverse().limit(5).toArray();

        const html = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h2 mb-1 fw-800" id="welcome-title">Panel de Control</h1>
                        <p class="text-muted small mb-0" id="welcome-subtitle">Bienvenido de nuevo, <span class="text-primary fw-bold">${Auth.currentUser.username}</span></p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary shadow-sm" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('addDeviceModal')).show()">
                            <i class="fas fa-plus-circle me-1"></i> Añadir Dispositivo
                        </button>
                        <button class="btn btn-light shadow-sm" onclick="UI.refreshCurrentSection()">
                            <i class="fas fa-sync-alt me-1"></i> Refrescar
                        </button>
                        <div class="text-end ms-3">
                            <div class="badge bg-light text-dark border p-2 mb-1">
                                <i class="far fa-calendar-alt me-1"></i> ${new Date().toLocaleDateString()}
                            </div>
                            <div class="text-muted small" id="live-clock"></div>
                        </div>
                    </div>
                </div>
                
                <div class="row g-4 mb-4">
                    <div class="col-md-3">
                        <div class="card stat-card shine-hover">
                            <div class="card-body">
                                <div class="icon-shape bg-danger text-white floating" style="animation-delay: 0s">
                                    <i class="fab fa-raspberry-pi"></i>
                                </div>
                                <h6>Raspberry Pi</h6>
                                <h2>${raspberryCount}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stat-card shine-hover">
                            <div class="card-body">
                                <div class="icon-shape bg-primary text-white floating" style="animation-delay: 0.5s">
                                    <i class="fas fa-server"></i>
                                </div>
                                <h6>Servidores</h6>
                                <h2>${serverCount}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stat-card shine-hover">
                            <div class="card-body">
                                <div class="icon-shape bg-success text-white floating" style="animation-delay: 1s">
                                    <i class="fas fa-network-wired"></i>
                                </div>
                                <h6>Red / Otros</h6>
                                <h2>${networkCount}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stat-card shine-hover">
                            <div class="card-body">
                                <div class="icon-shape bg-warning text-white floating" style="animation-delay: 1.5s">
                                    <i class="fas fa-bolt"></i>
                                </div>
                                <h6>Disponibilidad</h6>
                                <h2 class="availability-pct">${availability}%</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-8">
                        <div class="card mb-4">
                            <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                                <h5 class="mb-0 fw-bold">Infraestructura Crítica</h5>
                                <button class="btn btn-sm btn-primary" onclick="UI.renderInfrastructure()">Ver todo</button>
                            </div>
                            <div class="card-body pt-0">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle">
                                        <thead>
                                            <tr>
                                                <th>Dispositivo</th>
                                                <th>Tipo</th>
                                                <th>IP</th>
                                                <th>Estado</th>
                                                <th class="text-end">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="dashboard-server-list">
                                            ${await UI.getDashboardServerRows()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card mb-4">
                            <div class="card-header bg-white py-3 border-0">
                                <h5 class="mb-0 fw-bold">Actividad Reciente</h5>
                            </div>
                            <div class="card-body pt-0">
                                <div class="list-group list-group-flush">
                                    ${recentLogs.map(log => `
                                        <div class="list-group-item px-0 border-0 mb-2">
                                            <div class="d-flex w-100 justify-content-between">
                                                <h6 class="mb-1 fw-bold small">${log.action}</h6>
                                                <small class="text-muted">${new Date(log.timestamp).toLocaleTimeString()}</small>
                                            </div>
                                            <p class="mb-1 text-muted small">${log.details}</p>
                                        </div>
                                    `).join('')}
                                    ${recentLogs.length === 0 ? '<div class="text-center py-4 text-muted small">No hay actividad reciente</div>' : ''}
                                </div>
                                <button class="btn btn-light btn-sm w-100 mt-2" onclick="UI.renderLogs()">Ver todos los logs</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-area').innerHTML = html;
        UI.attachDashboardListeners();
    },

    getDashboardServerRows: async () => {
        const items = await db.servers.limit(5).toArray();
        if (items.length === 0) return '<tr><td colspan="5" class="text-center py-4 text-muted">No hay dispositivos registrados</td></tr>';

        return items.map(server => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="icon-shape bg-light text-dark me-2" style="width: 32px; height: 32px; font-size: 0.9rem; border-radius: 8px;">
                            <i class="${server.type === 'Raspberry Pi' ? 'fab fa-raspberry-pi' : 'fas fa-server'}"></i>
                        </div>
                        <span class="fw-bold text-dark small">${server.name}</span>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border" style="font-size: 0.6rem;">${server.type}</span></td>
                <td><code class="text-primary fw-bold" style="font-size: 0.75rem;">${server.ip}</code></td>
                <td>
                    <span class="badge bg-${server.status === 'online' ? 'success' : 'danger'} badge-status-${server.id} ${server.status === 'online' ? 'badge-status-online' : ''}" style="font-size: 0.6rem;">
                        ${server.status === 'online' ? 'en línea' : 'desconectado'}
                    </span>
                </td>
                <td>
                    <div class="d-flex justify-content-end gap-1">
                        <button class="btn btn-sm btn-light btn-ssh p-1" data-id="${server.id}" title="Terminal">
                            <i class="fas fa-terminal text-dark" style="font-size: 0.75rem;"></i>
                        </button>
                        <button class="btn btn-sm btn-light btn-ping p-1" data-id="${server.id}" title="Ping">
                            <i class="fas fa-broadcast-tower text-info" style="font-size: 0.75rem;"></i>
                        </button>
                        <button class="btn btn-sm btn-light btn-edit-device p-1" data-id="${server.id}" title="Editar">
                            <i class="fas fa-edit text-primary" style="font-size: 0.75rem;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    attachDashboardListeners: () => {
        UI.typeText('welcome-title', 'Panel de Control');

        const updateClock = () => {
            const el = document.getElementById('live-clock');
            if (el) {
                const now = new Date();
                el.innerText = now.toLocaleTimeString('es-ES', { hour12: false });
            }
        };
        updateClock();
        const clockInterval = setInterval(updateClock, 1000);

        // Clear interval when section changes to avoid memory leaks
        const observer = new MutationObserver(() => {
            if (!document.getElementById('live-clock')) {
                clearInterval(clockInterval);
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('content-area'), { childList: true });

        // Action buttons are handled by event delegation in UI.init()
    },

    renderInfrastructure: async () => {
        const raspberries = await db.servers.where('type').equals('Raspberry Pi').toArray();
        const servers = await db.servers.where('type').equals('Server').toArray();
        const others = await db.servers.where('type').noneOf(['Raspberry Pi', 'Server']).toArray();

        const html = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h2 mb-1 fw-800" id="infra-title">Gestión de Infraestructura</h1>
                        <p class="text-muted small mb-0">Administra y monitorea todos tus nodos y servidores</p>
                    </div>
                    <button class="btn btn-primary shadow-sm" id="btn-add-device">
                        <i class="fas fa-plus-circle"></i> Añadir Dispositivo
                    </button>
                </div>
                
                <div class="row g-4">
                    <!-- Raspberry Pi Section -->
                    <div class="col-12">
                        <div class="d-flex align-items-center mb-3">
                            <div class="icon-shape bg-danger text-white me-3" style="width: 40px; height: 40px; border-radius: 12px;">
                                <i class="fab fa-raspberry-pi"></i>
                            </div>
                            <h5 class="mb-0 fw-bold">Nodos Raspberry Pi</h5>
                            <span class="ms-3 badge bg-light text-dark border">${raspberries.length}</span>
                        </div>
                        <div class="row g-4">
                            ${UI.renderDeviceGrid(raspberries)}
                        </div>
                    </div>

                    <!-- Servers Section -->
                    <div class="col-12 mt-5">
                        <div class="d-flex align-items-center mb-3">
                            <div class="icon-shape bg-primary text-white me-3" style="width: 40px; height: 40px; border-radius: 12px;">
                                <i class="fas fa-server"></i>
                            </div>
                            <h5 class="mb-0 fw-bold">Servidores</h5>
                            <span class="ms-3 badge bg-light text-dark border">${servers.length}</span>
                        </div>
                        <div class="row g-4">
                            ${UI.renderDeviceGrid(servers)}
                        </div>
                    </div>

                    <!-- Others Section -->
                    <div class="col-12 mt-5">
                        <div class="d-flex align-items-center mb-3">
                            <div class="icon-shape bg-success text-white me-3" style="width: 40px; height: 40px; border-radius: 12px;">
                                <i class="fas fa-network-wired"></i>
                            </div>
                            <h5 class="mb-0 fw-bold">Red y Otros</h5>
                            <span class="ms-3 badge bg-light text-dark border">${others.length}</span>
                        </div>
                        <div class="row g-4">
                            ${UI.renderDeviceGrid(others)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-area').innerHTML = html;

        // Manual trigger for Add Device Modal to ensure it works
        document.getElementById('btn-add-device').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
            modal.show();
        });

        UI.attachInfrastructureListeners();

        // Typing effect for title
        UI.typeText('infra-title', 'Gestión de Infraestructura');
    },

    renderDeviceGrid: (items) => {
        if (items.length === 0) return '<div class="col-12 text-center text-muted py-5 card bg-light border-0" style="border-radius: 20px;">No hay dispositivos en esta categoría</div>';

        return items.map(item => `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shine-hover shadow-sm" style="border-radius: 24px;">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-4">
                            <div class="d-flex align-items-center">
                                <div class="icon-shape ${item.type === 'Raspberry Pi' ? 'bg-danger text-white' : 'bg-primary text-white'} me-3 shadow-lg" style="width: 55px; height: 55px; border-radius: 16px; font-size: 1.4rem;">
                                    <i class="${item.type === 'Raspberry Pi' ? 'fab fa-raspberry-pi' : 'fas fa-server'}"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-0 fw-800 text-white">${item.name}</h6>
                                    <small class="text-white-50">${item.os || 'Linux'}</small>
                                </div>
                            </div>
                            <span class="badge rounded-pill bg-${item.status === 'online' ? 'success' : 'danger'} bg-opacity-20 text-${item.status === 'online' ? 'success' : 'danger'} border border-${item.status === 'online' ? 'success' : 'danger'} border-opacity-25 px-3 py-2 card-status-${item.id}" style="font-size: 0.65rem;">
                                <i class="fas fa-circle me-1" style="font-size: 0.4rem;"></i>${item.status === 'online' ? 'EN LÍNEA' : 'DESCONECTADO'}
                            </span>
                        </div>
                        
                        <div class="p-3 rounded-4 mb-4" style="font-size: 0.9rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="text-white-50">IP</span>
                                <span class="fw-800 text-white" style="letter-spacing: 0.5px;">${item.ip}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="text-white-50">Puerto SSH</span>
                                <span class="fw-800 text-white">${item.port}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-white-50">Usuario</span>
                                <span class="fw-800 text-white">${item.username}</span>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-ssh btn-ssh-large shadow-sm" data-id="${item.id}">
                                <i class="fas fa-terminal me-2"></i> Terminal
                            </button>
                            <button class="btn btn-info btn-action border-0 shadow-sm" data-id="${item.id}" title="Hacer Ping">
                                <i class="fas fa-broadcast-tower text-white"></i>
                            </button>
                            <button class="btn btn-success btn-action border-0 shadow-sm" 
                                data-ip="${item.ip}" 
                                data-protocol="${item.protocol || 'http'}" 
                                data-port="${item.webPort || '80'}" 
                                title="Abrir Web">
                                <i class="fas fa-globe text-white"></i>
                            </button>
                            <button class="btn btn-primary btn-action border-0 shadow-sm" data-id="${item.id}" title="Editar" style="background: rgba(67, 97, 238, 0.2);">
                                <i class="fas fa-edit text-primary"></i>
                            </button>
                            <button class="btn btn-danger btn-action border-0 shadow-sm" data-id="${item.id}" title="Eliminar" style="background: rgba(247, 37, 133, 0.2);">
                                <i class="fas fa-trash text-danger"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    attachInfrastructureListeners: () => {
        // Most listeners are handled by event delegation in UI.init()
    },

    handleDeleteDevice: async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f72585',
            cancelButtonColor: '#4361ee',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#ffffff',
            customClass: {
                confirmButton: 'btn btn-danger px-4',
                cancelButton: 'btn btn-light px-4'
            }
        });

        if (result.isConfirmed) {
            await db.servers.delete(parseInt(id));
            UI.refreshCurrentSection();
            Swal.fire({
                title: 'Eliminado',
                text: 'El dispositivo ha sido eliminado.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    },

    showEditDeviceModal: async (id) => {
        const item = await db.servers.get(parseInt(id));
        const form = document.getElementById('edit-device-form');

        form.querySelector('[name="id"]').value = item.id;
        form.querySelector('[name="name"]').value = item.name;
        form.querySelector('[name="type"]').value = item.type;
        form.querySelector('[name="os"]').value = item.os || 'Linux';
        form.querySelector('[name="ip"]').value = item.ip;
        form.querySelector('[name="username"]').value = item.username;
        form.querySelector('[name="port"]').value = item.port;
        form.querySelector('[name="protocol"]').value = item.protocol || 'http';
        form.querySelector('[name="webPort"]').value = item.webPort || 80;

        bootstrap.Modal.getOrCreateInstance(document.getElementById('editDeviceModal')).show();
    },

    getDeviceColor: (type) => {
        switch (type) {
            case 'Raspberry Pi': return 'danger';
            case 'Server': return 'primary';
            case 'Switch': return 'info';
            case 'Router': return 'warning';
            case 'Storage': return 'secondary';
            default: return 'dark';
        }
    },

    openTerminal: async (serverId) => {
        const server = await db.servers.get(parseInt(serverId));

        // Ask for password with SweetAlert2
        const { value: password } = await Swal.fire({
            title: `Conectar a ${server.name}`,
            input: 'password',
            inputLabel: `Contraseña SSH para ${server.username}@${server.ip}`,
            inputPlaceholder: 'Ingrese su contraseña',
            showCancelButton: true,
            confirmButtonColor: '#4361ee',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Conectar',
            cancelButtonText: 'Cancelar',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            }
        });

        if (!password) return;

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('terminalModal'));
        document.getElementById('terminal-title').innerText = `SSH: ${server.username}@${server.ip} (${server.os || 'Linux'})`;
        modal.show();

        setTimeout(() => {
            const termContainer = document.getElementById('terminal-container');
            termContainer.innerHTML = '';
            const term = new Terminal({
                cursorBlink: true,
                theme: { background: '#1e1e1e' },
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace'
            });
            term.open(termContainer);

            // Check if we have a real backend connection
            if (UI.socket && UI.socket.connected) {
                console.log('📤 Solicitando conexión SSH al backend...', server.ip);
                UI.socket.emit('ssh-connect', {
                    host: server.ip,
                    port: server.port,
                    username: server.username,
                    password: password
                });

                // Limpiar listeners previos para evitar duplicados
                UI.socket.off('ssh-ready');
                UI.socket.off('ssh-data');
                UI.socket.off('ssh-error');
                UI.socket.off('ssh-close');

                UI.socket.on('ssh-ready', () => {
                    console.log('📥 SSH Ready recibido del backend');
                    term.writeln('\x1b[32mConexión SSH establecida.\x1b[0m\r\n');
                    term.onData(data => UI.socket.emit('ssh-data', data));
                });

                UI.socket.on('ssh-data', data => {
                    // console.log('📥 Datos SSH recibidos');
                    term.write(data);
                });

                UI.socket.on('ssh-error', err => {
                    console.error('❌ Error SSH recibido:', err);
                    term.writeln(`\r\n\x1b[31mError SSH: ${err}\x1b[0m`);
                });

                UI.socket.on('ssh-close', () => {
                    console.log('ℹ️ Conexión SSH cerrada');
                    term.writeln('\r\n\x1b[33mConexión cerrada por el servidor.\x1b[0m');
                    setTimeout(() => modal.hide(), 2000);
                });
            } else {
                // MOCK TERMINAL (No backend detected)
                term.writeln(`\x1b[33m[MODO DEMO] Conectando a ${server.ip}...\x1b[0m`);
                term.writeln(`\x1b[32mConexión simulada establecida para ${server.username}@${server.ip}\x1b[0m`);
                term.writeln('Escribe "help" para ver comandos disponibles.\r\n');
                term.write(`\x1b[36m${server.username}@${server.name.replace(/\s+/g, '-').toLowerCase()}:~$\x1b[0m `);

                let currentLine = '';
                term.onData(e => {
                    switch (e) {
                        case '\r': // Enter
                            term.write('\r\n');
                            UI.handleMockCommand(currentLine, term, server);
                            currentLine = '';
                            term.write(`\x1b[36m${server.username}@${server.name.replace(/\s+/g, '-').toLowerCase()}:~$\x1b[0m `);
                            break;
                        case '\u007F': // Backspace
                            if (currentLine.length > 0) {
                                currentLine = currentLine.slice(0, -1);
                                term.write('\b \b');
                            }
                            break;
                        default:
                            if (e >= ' ' && e <= '~') {
                                currentLine += e;
                                term.write(e);
                            }
                    }
                });
            }
        }, 500);
    },

    handleMockCommand: (cmd, term, server) => {
        const command = cmd.trim().toLowerCase();
        if (!command) return;

        if (command === 'help') {
            term.writeln('📋 Comandos disponibles en modo simulación:');
            term.writeln('  help     - Muestra esta ayuda');
            term.writeln('  ls       - Lista archivos (simulado)');
            term.writeln('  ping     - Realiza un ping a la IP del dispositivo');
            term.writeln('  whoami   - Muestra el usuario actual');
            term.writeln('  clear    - Limpia la pantalla');
            term.writeln('  exit     - Cierra la sesión');
        } else if (command === 'ls') {
            term.writeln('📁 config.json  📁 scripts/  📁 logs/  📁 backups/  📄 README.md');
        } else if (command === 'whoami') {
            term.writeln(server.username);
        } else if (command === 'clear') {
            term.write('\x1bc');
        } else if (command === 'exit') {
            term.writeln('👋 Cerrando conexión simulada...');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('terminalModal')).hide();
            }, 1000);
        } else if (command.startsWith('ping')) {
            term.writeln(`PING ${server.ip} (${server.ip}) 56(84) bytes de datos.`);
            let count = 0;
            const pingInterval = setInterval(() => {
                term.writeln(`64 bytes desde ${server.ip}: icmp_seq=${count + 1} ttl=64 tiempo=${(Math.random() * 5 + 1).toFixed(2)} ms`);
                count++;
                if (count >= 4) {
                    clearInterval(pingInterval);
                    term.writeln(`\r\n--- ${server.ip} estadísticas de ping ---`);
                    term.writeln('4 paquetes transmitidos, 4 recibidos, 0% pérdida, tiempo 3004ms');
                }
            }, 800);
        } else {
            term.writeln(`-bash: ${command}: comando no encontrado`);
        }
    },

    pingDevice: async (id) => {
        const item = await db.servers.get(parseInt(id));
        Swal.fire({
            title: `📡 Haciendo Ping a ${item.ip}`,
            html: '<div id="ping-output" class="text-start bg-dark text-success p-3 rounded font-monospace" style="min-height: 150px; font-size: 0.8rem; overflow-y: auto; max-height: 300px;"></div>',
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#4361ee',
            background: '#ffffff',
            didOpen: () => {
                const output = document.getElementById('ping-output');
                output.innerHTML = `PING ${item.ip} (${item.ip}) 56(84) bytes de datos.<br>`;
                let count = 0;
                const interval = setInterval(() => {
                    const time = (Math.random() * 5 + 1).toFixed(2);
                    output.innerHTML += `✓ 64 bytes desde ${item.ip}: icmp_seq=${count + 1} ttl=64 tiempo=${time} ms<br>`;
                    count++;
                    if (count >= 5) {
                        clearInterval(interval);
                        output.innerHTML += `<br>--- ${item.ip} estadísticas de ping ---<br>`;
                        output.innerHTML += `<span class="text-info">✓ 5 paquetes transmitidos, 5 recibidos, 0% pérdida, tiempo 4005ms</span>`;
                    }
                }, 800);
            }
        });
    },

    renderUsers: async () => {
        const users = await db.users.toArray();
        const html = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h2 mb-1 fw-800" id="users-title">Gestión de Usuarios</h1>
                        <p class="text-muted small mb-0">Administra los accesos al AdminPanel</p>
                    </div>
                    <button class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addUserModal">
                        <i class="fas fa-user-plus"></i> Nuevo Usuario
                    </button>
                </div>
                <div class="card border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="bg-light">
                                    <tr>
                                        <th class="ps-4">Usuario</th>
                                        <th>Rol</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(user => `
                                        <tr>
                                            <td class="ps-4">
                                                <div class="d-flex align-items-center">
                                                    <div class="icon-shape bg-light text-primary me-3" style="width: 35px; height: 35px; border-radius: 10px;">
                                                        <i class="fas fa-user"></i>
                                                    </div>
                                                    <span class="fw-bold text-dark">${user.username}</span>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-light text-info border">${user.role}</span></td>
                                            <td class="text-end pe-4">
                                                <button class="btn btn-sm btn-light btn-delete-user" data-id="${user.id}" ${user.username === 'admin' ? 'disabled' : ''}>
                                                    <i class="fas fa-trash text-danger"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-area').innerHTML = html;
        UI.typeText('users-title', 'Gestión de Usuarios');

        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const result = await Swal.fire({
                    title: '¿Eliminar usuario?',
                    text: "Esta acción no se puede deshacer",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#f72585',
                    cancelButtonColor: '#4361ee',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                });

                if (result.isConfirmed) {
                    await db.users.delete(parseInt(btn.dataset.id));
                    UI.renderUsers();
                    Swal.fire({
                        title: 'Eliminado',
                        text: 'El usuario ha sido eliminado.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        });
    },

    renderLogs: async () => {
        const logs = await db.logs.orderBy('timestamp').reverse().toArray();
        const html = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h2 mb-1 fw-800" id="logs-title">Registro de Actividad</h1>
                        <p class="text-muted small mb-0">Historial completo de acciones en el panel</p>
                    </div>
                </div>
                <div class="card border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="bg-light">
                                    <tr>
                                        <th class="ps-4">Fecha y Hora</th>
                                        <th>Acción</th>
                                        <th>Detalles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.map(log => `
                                        <tr>
                                            <td class="ps-4">
                                                <span class="text-muted small fw-bold">${new Date(log.timestamp).toLocaleString()}</span>
                                            </td>
                                            <td><span class="badge bg-light text-primary border">${log.action}</span></td>
                                            <td class="text-dark" style="font-size: 0.9rem;">${log.details}</td>
                                        </tr>
                                    `).join('')}
                                    ${logs.length === 0 ? '<tr><td colspan="3" class="text-center py-5 text-muted">No hay registros disponibles</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-area').innerHTML = html;
        UI.typeText('logs-title', 'Registro de Actividad');
    },

    renderSettings: () => {
        const html = `
            <div class="fade-in">
                <h1 class="h2 mb-4">Configuración</h1>
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card border-0 h-100">
                            <div class="card-body p-4">
                                <div class="icon-shape bg-light text-success mb-3" style="width: 48px; height: 48px;">
                                    <i class="fas fa-database"></i>
                                </div>
                                <h5 class="fw-bold mb-2">Base de Datos Local</h5>
                                <p class="text-muted small mb-4">Descarga una copia de seguridad de todos tus dispositivos, usuarios y registros en formato JSON.</p>
                                <button class="btn btn-primary w-100" onclick="exportDatabase()">
                                    <i class="fas fa-download"></i>Exportar Backup
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 h-100">
                            <div class="card-body p-4">
                                <div class="icon-shape bg-light text-warning mb-3" style="width: 48px; height: 48px;">
                                    <i class="fas fa-shield-alt"></i>
                                </div>
                                <h5 class="fw-bold mb-2">Seguridad</h5>
                                <p class="text-muted small mb-4">El panel utiliza IndexedDB para almacenamiento local y Socket.io con cifrado para túneles SSH.</p>
                                <div class="d-grid">
                                    <span class="badge bg-light text-dark border p-3 text-start">
                                        <i class="fas fa-info-circle me-2 text-primary"></i>
                                        Versión del Panel: 2.1.0
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('content-area').innerHTML = html;
    }
};
