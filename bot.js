import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys'
import googleTTS from 'google-tts-api';
import fs from 'fs';

async function KoneksiKeWa() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on("connection.update", ({ connection }) => {
        if (connection === "open") console.log("Berhasil koneksi ke WhatsApp!");
        if (connection === "close") console.log("Koneksi terputus!");
    });

    sock.ev.on("message.upsert", async (m) => {
        if (!m.messages) return;
        const msg = m.messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;
        const fromGroup = sender.endsWith('@g.us');
        const participant = fromGroup ? msg.key.participant : sender;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!textMessage) return;

        if (textMessage === '.menu') {
            const menuText = `📜 *Menu Bot* 📜\n\n1️⃣ .menu - Menampilkan menu\n2️⃣ .tts <pesan> - Konversi teks ke suara\n3️⃣ .confess <pesan> <nomor> <dari siapa> - Kirim pesan rahasia`;
            await sock.sendMessage(sender, { text: menuText });
        } else if (textMessage.startsWith('.tts ')) {
            const message = textMessage.slice(5);
            const url = googleTTS.getAudioUrl(message, { lang: 'id', slow: false });

            try {
                const res = await globalThis.fetch(url);
                const buffer = await res.arrayBuffer();
                const filePath = 'tts.mp3';
                fs.writeFileSync(filePath, Buffer.from(buffer));

                await sock.sendMessage(sender, { audio: { url: filePath }, mimetype: 'audio/mp4' });
                fs.unlinkSync(filePath);
            } catch (err) {
                await sock.sendMessage(sender, { text: "❌ Gagal membuat TTS!" });
            }
        } else if (textMessage.startsWith('.confess ')) {
            const args = textMessage.split(' ').slice(1);
            if (args.length < 3) {
                return sock.sendMessage(sender, { text: "❌ Format salah! Gunakan: .confess <pesan> <nomor> <dari siapa>" });
            }

            const pesan = args.slice(0, -2).join(' ');
            const nomor = args[args.length - 2] + "@s.whatsapp.net";
            const dariSiapa = args[args.length - 1];

            await sock.sendMessage(nomor, { text: `📩 *Pesan Rahasia*\n\n${pesan}\n\nDari: ${dariSiapa}` });
            await sock.sendMessage(sender, { text: "✅ Pesan rahasia telah dikirim!" });
        }
    });

    return sock;
}

KoneksiKeWa();
