const WebSocket = require('ws');

// Jalankan server di port 9090 sesuai permintaan frontend-mu
const wss = new WebSocket.Server({ port: 9090 });

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
            if (type === 'join-session') {
                if (!sessions.has(sessionId)) {
                    sessions.set(sessionId, new Set());
                }
                sessions.get(sessionId).add(ws);
                ws.sessionId = sessionId;
                console.log(`👤 Klien masuk ke Sesi: ${sessionId}`);
            }

            // 2. Meneruskan data WebRTC (Offer, Answer, ICE Candidates) ke perangkat lawan
            if (['offer', 'answer', 'ice-candidate', 'control-data'].includes(type)) {
                const room = sessions.get(sessionId);
                if (room) {
                    room.forEach(client => {
                        // Jangan kirim balik data ke pengirim aslinya
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(data));
                        }
                    });
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

console.log('🚀 WebRTC Signaling Server berjalan di ws://localhost:9090');