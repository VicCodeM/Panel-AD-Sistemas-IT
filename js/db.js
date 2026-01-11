// Initialize Dexie Database
const db = new Dexie("AdminPanelDB");

// Define Schema
db.version(4).stores({
    users: "++id, username, password, role, securityQuestion, securityAnswer",
    servers: "++id, name, ip, port, username, status, type, protocol, webPort, os",
    logs: "++id, timestamp, userId, action, details",
    settings: "id, key, value"
});

// Seed Initial Data (if empty)
async function seedDatabase() {
    const userCount = await db.users.count();
    if (userCount === 0) {
        // Create default admin user
        await db.users.add({
            username: "admin",
            password: "admin123",
            role: "admin",
            securityQuestion: "¿Cuál es tu color favorito?",
            securityAnswer: "azul"
        });

        // Add some dummy infrastructure
        await db.servers.bulkAdd([
            { name: "Raspberry Pi 4 - Media", ip: "192.168.1.10", port: 22, username: "pi", status: "online", type: "Raspberry Pi", protocol: "http", webPort: 80, os: "Linux" },
            { name: "Proxmox Cluster 01", ip: "192.168.1.20", port: 22, username: "root", status: "online", type: "Server", protocol: "https", webPort: 8006, os: "Linux" },
            { name: "Core Switch 01", ip: "192.168.1.2", port: 22, username: "admin", status: "online", type: "Switch", protocol: "https", webPort: 443, os: "Cisco IOS" },
            { name: "Edge Router", ip: "192.168.1.1", port: 22, username: "admin", status: "online", type: "Router", protocol: "http", webPort: 80, os: "RouterOS" },
            { name: "Windows Server 2022", ip: "192.168.1.100", port: 22, username: "Administrator", status: "online", type: "Server", protocol: "http", webPort: 80, os: "Windows" },
            { name: "Backup NAS", ip: "192.168.1.50", port: 22, username: "root", status: "offline", type: "Storage", protocol: "http", webPort: 5000, os: "Linux" }
        ]);

        await db.logs.add({
            timestamp: new Date().toISOString(),
            userId: 1,
            action: "System Init",
            details: "Base de datos inicializada con éxito."
        });
    }
}

// Helper to log actions
async function logAction(userId, action, details) {
    await db.logs.add({
        timestamp: new Date().toISOString(),
        userId: userId,
        action: action,
        details: details
    });
}

// Export/Backup Functionality
async function exportDatabase() {
    const allUsers = await db.users.toArray();
    const allServers = await db.servers.toArray();
    const allLogs = await db.logs.toArray();
    
    const data = {
        users: allUsers,
        servers: allServers,
        logs: allLogs,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().getTime()}.json`;
    a.click();
}

seedDatabase();
