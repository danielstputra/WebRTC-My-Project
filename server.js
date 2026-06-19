const WebSocket = require('ws');
const PORT = process.env.PORT || 9090; // Penting untuk Railway
const wss = new WebSocket.Server({ port: PORT });

// Menyimpan daftar klien berdasarkan Session ID (seperti "967842" di gambarmu)
const sessions = new Map();

wss.on('connection', (ws) => {
    console.log('🟢 Klien baru terhubung!');

    ws.on('message', (message) => {
        try {
            // WebRTC biasanya berkomunikasi menggunakan format JSON
            const data = JSON.parse(message);
            const { type, sessionId } = data;

            // 1. Klien bergabung ke sebuah sesi (ruangan)
            if (type === 'join' || type === 'join-session' || type === 'register') {
                const targetSessionId = sessionId || data.sessionId;
                ws.sessionId = targetSessionId;

                if (!sessions.has(targetSessionId)) sessions.set(targetSessionId, new Set());
                sessions.get(targetSessionId).add(ws);

                console.log(`👤 Klien terdaftar di Sesi: ${targetSessionId}`);

                if (type === 'join' || type === 'join-session') {
                    sessions.get(targetSessionId).forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'peer-joined', peerId: ws.id || 'guest' }));
                        }
                    });
                }
            }

            // 2. Meneruskan data WebRTC (Offer, Answer, ICE Candidates) ke perangkat lawan
            if (['offer', 'answer', 'ice-candidate', 'control-data'].includes(type)) {
                const room = sessions.get(ws.sessionId); // Gunakan sessionId dari socket, bukan dari data
                if (room) {
                    room.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(data));
                        }
                    });
                } else {
                    console.warn(`⚠️ Sesi ${ws.sessionId} tidak ditemukan untuk tipe ${type}`);
                }
            }
        } catch (error) {
            console.error('🔴 Error memproses pesan:', error.message);
        }
    });

    // Menangani saat klien menutup tab browser atau putus koneksi
    ws.on('close', () => {
        console.log('🔴 Klien terputus.');
        if (ws.sessionId && sessions.has(ws.sessionId)) {
            const room = sessions.get(ws.sessionId);
            room.delete(ws);
            // Bersihkan memori jika ruangan kosong
            if (room.size === 0) {
                sessions.delete(ws.sessionId);
                console.log(`🧹 Sesi ${ws.sessionId} dihapus karena kosong.`);
            }
        }
    });
});

console.log('🚀 WebRTC Signaling Server berjalan di wss://webrtc-my-project-production.up.railway.app/');