const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const crypto = require('crypto');
const { Telegraf, Scenes, session } = require('telegraf');

const app = express();
const axios = require('axios');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createssh, createvmess, createvless, createtrojan, createshadowsocks } = require('./modules/create');
const { renewssh, renewvmess, renewvless, renewtrojan, renewshadowsocks } = require('./modules/renew');

const fs = require('fs');
const vars = JSON.parse(fs.readFileSync('./.vars.json', 'utf8'));

const PAYDISINI_KEY = vars.PAYDISINI_KEY;
const BOT_TOKEN = vars.BOT_TOKEN;
const port = vars.PORT || 50123;
const ADMIN = vars.USER_ID; 
const NAMA_STORE = vars.NAMA_STORE || '@FTVPNSTORES';
const bot = new Telegraf(BOT_TOKEN);
const adminIds = ADMIN;
console.log('Bot initialized');

const db = new sqlite3.Database('./sellvpn.db', (err) => {
  if (err) {
    console.error('Kesalahan koneksi SQLite3:', err.message);
  } else {
    console.log('Terhubung ke SQLite3');
  }
});

db.run(`CREATE TABLE IF NOT EXISTS Server (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT,
  auth TEXT,
  harga INTEGER,
  nama_server TEXT,
  quota INTEGER,
  iplimit INTEGER,
  batas_create_akun INTEGER,
  total_create_akun INTEGER
)`, (err) => {
  if (err) {
    console.error('Kesalahan membuat tabel Server:', err.message);
  } else {
    console.log('Server table created or already exists');
  }
});

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  saldo INTEGER DEFAULT 0,
  CONSTRAINT unique_user_id UNIQUE (user_id)
)`, (err) => {
  if (err) {
    console.error('Kesalahan membuat tabel users:', err.message);
  } else {
    console.log('Users table created or already exists');
  }
});

const userState = {};
console.log('User state initialized');

bot.command(['start', 'menu'], async (ctx) => {
  console.log('Start or Menu command received');
  
  const userId = ctx.from.id;
  db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      console.error('Kesalahan saat memeriksa user_id:', err.message);
      return;
    }

    if (row) {
      console.log(`User ID ${userId} sudah ada di database`);
    } else {
      db.run('INSERT INTO users (user_id) VALUES (?)', [userId], (err) => {
        if (err) {
          console.error('Kesalahan saat menyimpan user_id:', err.message);
        } else {
          console.log(`User ID ${userId} berhasil disimpan`);
        }
      });
    }
  });

  await sendMainMenu(ctx);
});

bot.command('admin', async (ctx) => {
  console.log('Admin menu requested');
  
  if (!adminIds.includes(ctx.from.id)) {
    await ctx.reply('🚫 Anda tidak memiliki izin untuk mengakses menu admin.');
    return;
  }

  await sendAdminMenu(ctx);
});
async function sendMainMenu(ctx) {
  const keyboard = [
    [
      { text: '➕ Buat Akun', callback_data: 'service_create' },
      { text: '♻️ Perpanjang Akun', callback_data: 'service_renew' }
    ],
    [
      { text: '💰 TopUp Saldo', callback_data: 'topup_saldo' },
      { text: '💳 Cek Saldo', callback_data: 'cek_saldo' }
    ],
  ];

  const uptime = os.uptime();
  const days = Math.floor(uptime / (60 * 60 * 24));
  
  let jumlahServer = 0;
  try {
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) AS count FROM Server', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    jumlahServer = row.count;
  } catch (err) {
    console.error('Kesalahan saat mengambil jumlah server:', err.message);
  }
  let jumlahPengguna = 0;
  try {
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    jumlahPengguna = row.count;
  } catch (err) {
    console.error('Kesalahan saat mengambil jumlah pengguna:', err.message);
  }

  const messageText = `*Selamat datang di ${NAMA_STORE},
Powered by FTVPN* 🚀
Bot VPN serba otomatis untuk membeli
layanan VPN dengan mudah dan cepat
Nikmati kemudahan dan kecepatan
dalam layanan VPN dengan bot kami!

⏳ *Uptime bot:* ${days} Hari
🌐 *Server tersedia:* ${jumlahServer}
👥 *Jumlah pengguna:* ${jumlahPengguna}

*Silakan pilih opsi layanan:*`;

  try {
    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
    console.log('Main menu sent');
  } catch (error) {
    if (error.response && error.response.error_code === 400) {
      // Jika pesan tidak dapat diedit, kirim pesan baru
      await ctx.reply(messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      console.log('Main menu sent as new message');
    } else {
      console.error('Error saat mengirim menu utama:', error);
    }
  }
}
bot.command('helpadmin', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const helpMessage = `
*📋 Daftar Perintah Admin:*

1. /addserver - Menambahkan server baru.
2. /addsaldo - Menambahkan saldo ke akun pengguna.
3. /editharga - Mengedit harga layanan.
4. /editnama - Mengedit nama server.
5. /editdomain - Mengedit domain server.
6. /editauth - Mengedit auth server.
7. /editlimitquota - Mengedit batas quota server.
8. /editlimitip - Mengedit batas IP server.
9. /editlimitcreate - Mengedit batas pembuatan akun server.
10. /edittotalcreate - Mengedit total pembuatan akun server.
11. /broadcast - Mengirim pesan siaran ke semua pengguna.

Gunakan perintah ini dengan format yang benar untuk menghindari kesalahan.
`;

  ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

bot.command('broadcast', async (ctx) => {
  const userId = ctx.message.from.id;
  console.log(`Broadcast command received from user_id: ${userId}`);
  if (!adminIds.includes(userId)) {
      console.log(`⚠️ User ${userId} tidak memiliki izin untuk menggunakan perintah ini.`);
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const message = ctx.message.reply_to_message ? ctx.message.reply_to_message.text : ctx.message.text.split(' ').slice(1).join(' ');
  if (!message) {
      console.log('⚠️ Pesan untuk disiarkan tidak diberikan.');
      return ctx.reply('⚠️ Mohon berikan pesan untuk disiarkan.', { parse_mode: 'Markdown' });
  }

  db.all("SELECT user_id FROM users", [], (err, rows) => {
      if (err) {
          console.error('⚠️ Kesalahan saat mengambil daftar pengguna:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengambil daftar pengguna.', { parse_mode: 'Markdown' });
      }

      rows.forEach((row) => {
          const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
          axios.post(telegramUrl, {
              chat_id: row.user_id,
              text: message
          }).then(() => {
              console.log(`✅ Pesan siaran berhasil dikirim ke ${row.user_id}`);
          }).catch((error) => {
              console.error(`⚠️ Kesalahan saat mengirim pesan siaran ke ${row.user_id}`, error.message);
          });
      });

      ctx.reply('✅ Pesan siaran berhasil dikirim.', { parse_mode: 'Markdown' });
  });
});
bot.command('addsaldo', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/addsaldo <user_id> <jumlah>`', { parse_mode: 'Markdown' });
  }

  const targetUserId = parseInt(args[1]);
  const amount = parseInt(args[2]);

  if (isNaN(targetUserId) || isNaN(amount)) {
      return ctx.reply('⚠️ `user_id` dan `jumlah` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  if (/\s/.test(args[1]) || /\./.test(args[1]) || /\s/.test(args[2]) || /\./.test(args[2])) {
      return ctx.reply('⚠️ `user_id` dan `jumlah` tidak boleh mengandung spasi atau titik.', { parse_mode: 'Markdown' });
  }

  db.get("SELECT * FROM users WHERE user_id = ?", [targetUserId], (err, row) => {
      if (err) {
          console.error('⚠️ Kesalahan saat memeriksa `user_id`:', err.message);
          return ctx.reply('⚠️ Kesalahan saat memeriksa `user_id`.', { parse_mode: 'Markdown' });
      }

      if (!row) {
          return ctx.reply('⚠️ `user_id` tidak terdaftar.', { parse_mode: 'Markdown' });
      }

      db.run("UPDATE users SET saldo = saldo + ? WHERE user_id = ?", [amount, targetUserId], function(err) {
          if (err) {
              console.error('⚠️ Kesalahan saat menambahkan saldo:', err.message);
              return ctx.reply('⚠️ Kesalahan saat menambahkan saldo.', { parse_mode: 'Markdown' });
          }

          if (this.changes === 0) {
              return ctx.reply('⚠️ Pengguna tidak ditemukan.', { parse_mode: 'Markdown' });
          }

          ctx.reply(`✅ Saldo sebesar \`${amount}\` berhasil ditambahkan untuk \`user_id\` \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
      });
  });
});
bot.command('addserver', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 7) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/addserver <domain> <auth> <harga> <nama_server> <quota> <iplimit> <batas_create_account>`', { parse_mode: 'Markdown' });
  }

  const [domain, auth, harga, nama_server, quota, iplimit, batas_create_akun] = args.slice(1);

  const numberOnlyRegex = /^\d+$/;
  if (!numberOnlyRegex.test(harga) || !numberOnlyRegex.test(quota) || !numberOnlyRegex.test(iplimit) || !numberOnlyRegex.test(batas_create_akun)) {
      return ctx.reply('⚠️ `harga`, `quota`, `iplimit`, dan `batas_create_akun` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("INSERT INTO Server (domain, auth, harga, nama_server, quota, iplimit, batas_create_akun) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [domain, auth, parseInt(harga), nama_server, parseInt(quota), parseInt(iplimit), parseInt(batas_create_akun)], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat menambahkan server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat menambahkan server.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Server \`${nama_server}\` berhasil ditambahkan.`, { parse_mode: 'Markdown' });
  });
});
bot.command('editharga', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editharga <domain> <harga>`', { parse_mode: 'Markdown' });
  }

  const [domain, harga] = args.slice(1);

  if (!/^\d+$/.test(harga)) {
      return ctx.reply('⚠️ `harga` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("UPDATE Server SET harga = ? WHERE domain = ?", [parseInt(harga), domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit harga server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit harga server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Harga server \`${domain}\` berhasil diubah menjadi \`${harga}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editnama', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editnama <domain> <nama_server>`', { parse_mode: 'Markdown' });
  }

  const [domain, nama_server] = args.slice(1);

  db.run("UPDATE Server SET nama_server = ? WHERE domain = ?", [nama_server, domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit nama server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit nama server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Nama server \`${domain}\` berhasil diubah menjadi \`${nama_server}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editdomain', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editdomain <old_domain> <new_domain>`', { parse_mode: 'Markdown' });
  }

  const [old_domain, new_domain] = args.slice(1);

  db.run("UPDATE Server SET domain = ? WHERE domain = ?", [new_domain, old_domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit domain server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit domain server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Domain server \`${old_domain}\` berhasil diubah menjadi \`${new_domain}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editauth', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editauth <domain> <auth>`', { parse_mode: 'Markdown' });
  }

  const [domain, auth] = args.slice(1);

  db.run("UPDATE Server SET auth = ? WHERE domain = ?", [auth, domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit auth server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit auth server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Auth server \`${domain}\` berhasil diubah menjadi \`${auth}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editlimitquota', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editlimitquota <domain> <quota>`', { parse_mode: 'Markdown' });
  }

  const [domain, quota] = args.slice(1);

  if (!/^\d+$/.test(quota)) {
      return ctx.reply('⚠️ `quota` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("UPDATE Server SET quota = ? WHERE domain = ?", [parseInt(quota), domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit quota server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit quota server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Quota server \`${domain}\` berhasil diubah menjadi \`${quota}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editlimitip', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editlimitip <domain> <iplimit>`', { parse_mode: 'Markdown' });
  }

  const [domain, iplimit] = args.slice(1);

  if (!/^\d+$/.test(iplimit)) {
      return ctx.reply('⚠️ `iplimit` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("UPDATE Server SET iplimit = ? WHERE domain = ?", [parseInt(iplimit), domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit iplimit server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit iplimit server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Iplimit server \`${domain}\` berhasil diubah menjadi \`${iplimit}\`.`, { parse_mode: 'Markdown' });
  });
});

bot.command('editlimitcreate', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/editlimitcreate <domain> <batas_create_akun>`', { parse_mode: 'Markdown' });
  }

  const [domain, batas_create_akun] = args.slice(1);

  if (!/^\d+$/.test(batas_create_akun)) {
      return ctx.reply('⚠️ `batas_create_akun` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("UPDATE Server SET batas_create_akun = ? WHERE domain = ?", [parseInt(batas_create_akun), domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit batas_create_akun server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit batas_create_akun server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Batas create akun server \`${domain}\` berhasil diubah menjadi \`${batas_create_akun}\`.`, { parse_mode: 'Markdown' });
  });
});
bot.command('edittotalcreate', async (ctx) => {
  const userId = ctx.message.from.id;
  if (!adminIds.includes(userId)) {
      return ctx.reply('⚠️ Anda tidak memiliki izin untuk menggunakan perintah ini.', { parse_mode: 'Markdown' });
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
      return ctx.reply('⚠️ Format salah. Gunakan: `/edittotalcreate <domain> <total_create_akun>`', { parse_mode: 'Markdown' });
  }

  const [domain, total_create_akun] = args.slice(1);

  if (!/^\d+$/.test(total_create_akun)) {
      return ctx.reply('⚠️ `total_create_akun` harus berupa angka.', { parse_mode: 'Markdown' });
  }

  db.run("UPDATE Server SET total_create_akun = ? WHERE domain = ?", [parseInt(total_create_akun), domain], function(err) {
      if (err) {
          console.error('⚠️ Kesalahan saat mengedit total_create_akun server:', err.message);
          return ctx.reply('⚠️ Kesalahan saat mengedit total_create_akun server.', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
          return ctx.reply('⚠️ Server tidak ditemukan.', { parse_mode: 'Markdown' });
      }

      ctx.reply(`✅ Total create akun server \`${domain}\` berhasil diubah menjadi \`${total_create_akun}\`.`, { parse_mode: 'Markdown' });
  });
});
async function handleServiceAction(ctx, action) {
  let keyboard;
  if (action === 'create') {
    keyboard = [
      [{ text: 'Buat Ssh/Ovpn', callback_data: 'create_ssh' }],      
      [{ text: 'Buat Vmess', callback_data: 'create_vmess' }],
      [{ text: 'Buat Vless', callback_data: 'create_vless' }],
      [{ text: 'Buat Trojan', callback_data: 'create_trojan' }],
      [{ text: 'Buat Shadowsocks', callback_data: 'create_shadowsocks' }],
      [{ text: '🔙 Kembali', callback_data: 'send_main_menu' }]
    ];
  } else if (action === 'renew') {
    keyboard = [
      [{ text: 'Perpanjang Ssh/Ovpn', callback_data: 'renew_ssh' }],      
      [{ text: 'Perpanjang Vmess', callback_data: 'renew_vmess' }],
      [{ text: 'Perpanjang Vless', callback_data: 'renew_vless' }],
      [{ text: 'Perpanjang Trojan', callback_data: 'renew_trojan' }],
      [{ text: 'Perpanjang Shadowsocks', callback_data: 'renew_shadowsocks' }],
      [{ text: '🔙 Kembali', callback_data: 'send_main_menu' }]
    ];
  } 
  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: keyboard
    });
    console.log(`${action} service menu sent`);
  } catch (error) {
    if (error.response && error.response.error_code === 400) {
      // Jika pesan tidak dapat diedit, kirim pesan baru
      await ctx.reply(`Pilih jenis layanan yang ingin Anda ${action}:`, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      console.log(`${action} service menu sent as new message`);
    } else {
      console.error(`Error saat mengirim menu ${action}:`, error);
    }
  }
}
async function sendAdminMenu(ctx) {
  const adminKeyboard = [
    [
      { text: '➕ Tambah Server', callback_data: 'addserver' },
      { text: '❌ Hapus Server', callback_data: 'deleteserver' }
    ],
    [
      { text: '💲 Edit Harga', callback_data: 'editserver_harga' },
      { text: '📝 Edit Nama', callback_data: 'nama_server_edit' }
    ],
    [
      { text: '🌐 Edit Domain', callback_data: 'editserver_domain' },
      { text: '🔑 Edit Auth', callback_data: 'editserver_auth' }
    ],
    [
      { text: '📊 Edit Quota', callback_data: 'editserver_quota' },
      { text: '📶 Edit Limit IP', callback_data: 'editserver_limit_ip' }
    ],
    [
      { text: '🔢 Edit Batas Create', callback_data: 'editserver_batas_create_akun' },
      { text: '🔢 Edit Total Create', callback_data: 'editserver_total_create_akun' }
    ],
    [
      { text: '💵 Tambah Saldo', callback_data: 'addsaldo_user' },
      { text: '📋 List Server', callback_data: 'listserver' }
    ],
    [
      { text: '♻️ Reset Server', callback_data: 'resetdb' },
      { text: 'ℹ️ Detail Server', callback_data: 'detailserver' }
    ],
    [
      { text: '🔙 Kembali', callback_data: 'send_main_menu' }
    ]
  ];

  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: adminKeyboard
    });
    console.log('Admin menu sent');
  } catch (error) {
    if (error.response && error.response.error_code === 400) {
      // Jika pesan tidak dapat diedit, kirim pesan baru
      await ctx.reply('Menu Admin:', {
        reply_markup: {
          inline_keyboard: adminKeyboard
        }
      });
      console.log('Admin menu sent as new message');
    } else {
      console.error('Error saat mengirim menu admin:', error);
    }
  }
}

bot.action('service_create', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await handleServiceAction(ctx, 'create');
});

bot.action('service_renew', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await handleServiceAction(ctx, 'renew');
});

bot.action('send_main_menu', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await sendMainMenu(ctx);
});

bot.action('create_vmess', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'create', 'vmess');
});

bot.action('create_vless', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'create', 'vless');
});

bot.action('create_trojan', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'create', 'trojan');
});

bot.action('create_shadowsocks', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'create', 'shadowsocks');
});

bot.action('create_ssh', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'create', 'ssh');
});

bot.action('renew_vmess', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'renew', 'vmess');
});

bot.action('renew_vless', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'renew', 'vless');
});

bot.action('renew_trojan', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'renew', 'trojan');
});

bot.action('renew_shadowsocks', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'renew', 'shadowsocks');
});

bot.action('renew_ssh', async (ctx) => {
  if (!ctx || !ctx.match) {
    return ctx.reply('❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.', { parse_mode: 'Markdown' });
  }
  await startSelectServer(ctx, 'renew', 'ssh');
});
async function startSelectServer(ctx, action, type, page = 0) {
  try {
    console.log(`Memulai proses ${action} untuk ${type} di halaman ${page + 1}`);

    db.all('SELECT * FROM Server', [], (err, servers) => {
      if (err) {
        console.error('⚠️ Error fetching servers:', err.message);
        return ctx.reply('⚠️ *PERHATIAN!* Tidak ada server yang tersedia saat ini. Coba lagi nanti!', { parse_mode: 'Markdown' });
      }

      if (servers.length === 0) {
        console.log('Tidak ada server yang tersedia');
        return ctx.reply('⚠️ *PERHATIAN!* Tidak ada server yang tersedia saat ini. Coba lagi nanti!', { parse_mode: 'Markdown' });
      }

      const serversPerPage = 6;
      const totalPages = Math.ceil(servers.length / serversPerPage);
      const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
      const start = currentPage * serversPerPage;
      const end = start + serversPerPage;
      const currentServers = servers.slice(start, end);

      const keyboard = [];
      for (let i = 0; i < currentServers.length; i += 2) {
        const row = [];
        const server1 = currentServers[i];
        const server2 = currentServers[i + 1];
        const server1Text = `${server1.nama_server}`;
        row.push({ text: server1Text, callback_data: `${action}_username_${type}_${server1.id}` });

        if (server2) {
          const server2Text = `${server2.nama_server}`;
          row.push({ text: server2Text, callback_data: `${action}_username_${type}_${server2.id}` });
        }
        keyboard.push(row);
      }

      const navButtons = [];
      if (totalPages > 1) { 
        if (currentPage > 0) {
          navButtons.push({ text: '⬅️ Back', callback_data: `navigate_${action}_${type}_${currentPage - 1}` });
        }
        if (currentPage < totalPages - 1) {
          navButtons.push({ text: '➡️ Next', callback_data: `navigate_${action}_${type}_${currentPage + 1}` });
        }
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }
      keyboard.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]);

      const serverList = currentServers.map(server => {
        const hargaPer30Hari = server.harga * 30; 
        const isFull = server.total_create_akun >= server.batas_create_akun;
        return `🌐 *${server.nama_server}*\n` +
               `💰 Harga per hari: Rp${server.harga}\n` +
               `📅 Harga per 30 hari: Rp${hargaPer30Hari}\n` +
               `📊 Quota: ${server.quota}GB\n` +
               `🔢 Limit IP: ${server.iplimit} IP\n` +
               (isFull ? `⚠️ *Server Penuh*` : `👥 Total Create Akun: ${server.total_create_akun}/${server.batas_create_akun}`);
      }).join('\n\n');

      if (ctx.updateType === 'callback_query') {
        ctx.editMessageText(`📋 *List Server (Halaman ${currentPage + 1} dari ${totalPages}):*\n\n${serverList}`, {
          reply_markup: {
            inline_keyboard: keyboard
          },
          parse_mode: 'Markdown'
        });
      } else {
        ctx.reply(`📋 *List Server (Halaman ${currentPage + 1} dari ${totalPages}):*\n\n${serverList}`, {
          reply_markup: {
            inline_keyboard: keyboard
          },
          parse_mode: 'Markdown'
        });
      }
      userState[ctx.chat.id] = { step: `${action}_username_${type}`, page: currentPage };
    });
  } catch (error) {
    console.error(`❌ Error saat memulai proses ${action} untuk ${type}:`, error);
    await ctx.reply(`❌ *GAGAL!* Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.`, { parse_mode: 'Markdown' });
  }
}

bot.action(/navigate_(\w+)_(\w+)_(\d+)/, async (ctx) => {
  const [, action, type, page] = ctx.match;
  await startSelectServer(ctx, action, type, parseInt(page, 10));
});
bot.action(/(create|renew)_username_(vmess|vless|trojan|shadowsocks|ssh)_(.+)/, async (ctx) => {
  const action = ctx.match[1];
  const type = ctx.match[2];
  const serverId = ctx.match[3];
  userState[ctx.chat.id] = { step: `username_${action}_${type}`, serverId, type, action };

  db.get('SELECT batas_create_akun, total_create_akun FROM Server WHERE id = ?', [serverId], async (err, server) => {
    if (err) {
      console.error('⚠️ Error fetching server details:', err.message);
      return ctx.reply('❌ *Terjadi kesalahan saat mengambil detail server.*', { parse_mode: 'Markdown' });
    }

    if (!server) {
      return ctx.reply('❌ *Server tidak ditemukan.*', { parse_mode: 'Markdown' });
    }

    const batasCreateAkun = server.batas_create_akun;
    const totalCreateAkun = server.total_create_akun;

    if (totalCreateAkun >= batasCreateAkun) {
      return ctx.reply('❌ *Server penuh. Tidak dapat membuat akun baru di server ini.*', { parse_mode: 'Markdown' });
    }

    await ctx.reply('👤 *Masukkan username:*', { parse_mode: 'Markdown' });
  });
});
bot.on('text', async (ctx) => {
  const state = userState[ctx.chat.id];

  if (!state) return; 

  if (state.step.startsWith('username_')) {
    state.username = ctx.message.text.trim();
    if (!state.username) {
      return ctx.reply('❌ *Username tidak valid. Masukkan username yang valid.*', { parse_mode: 'Markdown' });
    }
    if (state.username.length < 3 || state.username.length > 20) {
      return ctx.reply('❌ *Username harus terdiri dari 3 hingga 20 karakter.*', { parse_mode: 'Markdown' });
    }
    if (/[^a-zA-Z0-9]/.test(state.username)) {
      return ctx.reply('❌ *Username tidak boleh mengandung karakter khusus atau spasi.*', { parse_mode: 'Markdown' });
    }
    const { username, serverId, type, action } = state;
    if (action === 'create') {
      if (type === 'ssh') {
        state.step = `password_${state.action}_${state.type}`;
        await ctx.reply('🔑 *Masukkan password:*', { parse_mode: 'Markdown' });
      } else {
        state.step = `exp_${state.action}_${state.type}`;
        await ctx.reply('⏳ *Masukkan masa aktif (hari):*', { parse_mode: 'Markdown' });
      }
    } else if (action === 'renew') {
      state.step = `exp_${state.action}_${state.type}`;
      await ctx.reply('⏳ *Masukkan masa aktif (hari):*', { parse_mode: 'Markdown' });
    }
  } else if (state.step.startsWith('password_')) {
    state.password = ctx.message.text.trim();
    if (!state.password) {
      return ctx.reply('❌ *Password tidak valid. Masukkan password yang valid.*', { parse_mode: 'Markdown' });
    }
    if (state.password.length < 6) {
      return ctx.reply('❌ *Password harus terdiri dari minimal 6 karakter.*', { parse_mode: 'Markdown' });
    }
    if (/[^a-zA-Z0-9]/.test(state.password)) {
      return ctx.reply('❌ *Password tidak boleh mengandung karakter khusus atau spasi.*', { parse_mode: 'Markdown' });
    }
    state.step = `exp_${state.action}_${state.type}`;
    await ctx.reply('⏳ *Masukkan masa aktif (hari):*', { parse_mode: 'Markdown' });
  } else if (state.step.startsWith('exp_')) {
    const expInput = ctx.message.text.trim();
    if (!/^\d+$/.test(expInput)) {
      return ctx.reply('❌ *Masa aktif tidak valid. Masukkan angka yang valid.*', { parse_mode: 'Markdown' });
    }
    const exp = parseInt(expInput, 10);
    if (isNaN(exp) || exp <= 0) {
      return ctx.reply('❌ *Masa aktif tidak valid. Masukkan angka yang valid.*', { parse_mode: 'Markdown' });
    }
    if (exp > 365) {
      return ctx.reply('❌ *Masa aktif tidak boleh lebih dari 365 hari.*', { parse_mode: 'Markdown' });
    }
    state.exp = exp;

    db.get('SELECT quota, iplimit FROM Server WHERE id = ?', [state.serverId], async (err, server) => {
      if (err) {
        console.error('⚠️ Error fetching server details:', err.message);
        return ctx.reply('❌ *Terjadi kesalahan saat mengambil detail server.*', { parse_mode: 'Markdown' });
      }

      if (!server) {
        return ctx.reply('❌ *Server tidak ditemukan.*', { parse_mode: 'Markdown' });
      }

      state.quota = server.quota;
      state.iplimit = server.iplimit;

      const { username, password, exp, quota, iplimit, serverId, type, action } = state;
      let msg;

      db.get('SELECT harga FROM Server WHERE id = ?', [serverId], async (err, server) => {
        if (err) {
          console.error('⚠️ Error fetching server price:', err.message);
          return ctx.reply('❌ *Terjadi kesalahan saat mengambil harga server.*', { parse_mode: 'Markdown' });
        }

        if (!server) {
          return ctx.reply('❌ *Server tidak ditemukan.*', { parse_mode: 'Markdown' });
        }

        const harga = server.harga;
        const totalHarga = harga * state.exp; 

        db.get('SELECT saldo FROM users WHERE user_id = ?', [ctx.from.id], async (err, user) => {
          if (err) {
            console.error('⚠️ Kesalahan saat mengambil saldo pengguna:', err.message);
            return ctx.reply('❌ *Terjadi kesalahan saat mengambil saldo pengguna.*', { parse_mode: 'Markdown' });
          }

          if (!user) {
            return ctx.reply('❌ *Pengguna tidak ditemukan.*', { parse_mode: 'Markdown' });
          }

          const saldo = user.saldo;

          if (saldo < totalHarga) {
            return ctx.reply('❌ *Saldo Anda tidak mencukupi untuk melakukan transaksi ini.*', { parse_mode: 'Markdown' });
          }
          if (action === 'create') {
            if (type === 'vmess') {
              msg = await createvmess(username, exp, quota, iplimit, serverId);
            } else if (type === 'vless') {
              msg = await createvless(username, exp, quota, iplimit, serverId);
            } else if (type === 'trojan') {
              msg = await createtrojan(username, exp, quota, iplimit, serverId);
            } else if (type === 'shadowsocks') {
              msg = await createshadowsocks(username, exp, quota, iplimit, serverId);
            } else if (type === 'ssh') {
              msg = await createssh(username, password, exp, iplimit, serverId);
            }
          } else if (action === 'renew') {
            if (type === 'vmess') {
              msg = await renewvmess(username, exp, quota, iplimit, serverId);
            } else if (type === 'vless') {
              msg = await renewvless(username, exp, quota, iplimit, serverId);
            } else if (type === 'trojan') {
              msg = await renewtrojan(username, exp, quota, iplimit, serverId);
            } else if (type === 'shadowsocks') {
              msg = await renewshadowsocks(username, exp, quota, iplimit, serverId);
            } else if (type === 'ssh') {
              msg = await renewssh(username, exp, iplimit, serverId);
            }
          }
          // Kurangi saldo pengguna
          db.run('UPDATE users SET saldo = saldo - ? WHERE user_id = ?', [totalHarga, ctx.from.id], (err) => {
            if (err) {
              console.error('⚠️ Kesalahan saat mengurangi saldo pengguna:', err.message);
              return ctx.reply('❌ *Terjadi kesalahan saat mengurangi saldo pengguna.*', { parse_mode: 'Markdown' });
            }
          });
          // Tambahkan total_create_akun
          db.run('UPDATE Server SET total_create_akun = total_create_akun + 1 WHERE id = ?', [serverId], (err) => {
            if (err) {
              console.error('⚠️ Kesalahan saat menambahkan total_create_akun:', err.message);
              return ctx.reply('❌ *Terjadi kesalahan saat menambahkan total_create_akun.*', { parse_mode: 'Markdown' });
            }
          });

          await ctx.reply(msg, { parse_mode: 'Markdown' });
          delete userState[ctx.chat.id];
        });
      });
    });
  } else if (state.step === 'addserver') {
    const domain = ctx.message.text.trim();
    if (!domain) {
      await ctx.reply('⚠️ *Domain tidak boleh kosong.* Silakan masukkan domain server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_auth';
    state.domain = domain;
    await ctx.reply('🔑 *Silakan masukkan auth server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_auth') {
    const auth = ctx.message.text.trim();
    if (!auth) {
      await ctx.reply('⚠️ *Auth tidak boleh kosong.* Silakan masukkan auth server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_nama_server';
    state.auth = auth;
    await ctx.reply('🏷️ *Silakan masukkan nama server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_nama_server') {
    const nama_server = ctx.message.text.trim();
    if (!nama_server) {
      await ctx.reply('⚠️ *Nama server tidak boleh kosong.* Silakan masukkan nama server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_quota';
    state.nama_server = nama_server;
    await ctx.reply('📊 *Silakan masukkan quota server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_quota') {
    const quota = parseInt(ctx.message.text.trim(), 10);
    if (isNaN(quota)) {
      await ctx.reply('⚠️ *Quota tidak valid.* Silakan masukkan quota server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_iplimit';
    state.quota = quota;
    await ctx.reply('🔢 *Silakan masukkan limit IP server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_iplimit') {
    const iplimit = parseInt(ctx.message.text.trim(), 10);
    if (isNaN(iplimit)) {
      await ctx.reply('⚠️ *Limit IP tidak valid.* Silakan masukkan limit IP server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_batas_create_akun';
    state.iplimit = iplimit;
    await ctx.reply('🔢 *Silakan masukkan batas create akun server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_batas_create_akun') {
    const batas_create_akun = parseInt(ctx.message.text.trim(), 10);
    if (isNaN(batas_create_akun)) {
      await ctx.reply('⚠️ *Batas create akun tidak valid.* Silakan masukkan batas create akun server yang valid.', { parse_mode: 'Markdown' });
      return;
    }

    state.step = 'addserver_harga';
    state.batas_create_akun = batas_create_akun;
    await ctx.reply('💰 *Silakan masukkan harga server:*', { parse_mode: 'Markdown' });
  } else if (state.step === 'addserver_harga') {
    const harga = parseFloat(ctx.message.text.trim());
    if (isNaN(harga) || harga <= 0) {
      await ctx.reply('⚠️ *Harga tidak valid.* Silakan masukkan harga server yang valid.', { parse_mode: 'Markdown' });
      return;
    }
    const { domain, auth, nama_server, quota, iplimit, batas_create_akun } = state;

    try {
      db.run('INSERT INTO Server (domain, auth, nama_server, quota, iplimit, batas_create_akun, harga, total_create_akun) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [domain, auth, nama_server, quota, iplimit, batas_create_akun, harga, 0], function(err) {
        if (err) {
          console.error('Error saat menambahkan server:', err.message);
          ctx.reply('❌ *Terjadi kesalahan saat menambahkan server baru.*', { parse_mode: 'Markdown' });
        } else {
          ctx.reply(`✅ *Server baru dengan domain ${domain} telah berhasil ditambahkan.*\n\n📄 *Detail Server:*\n- Domain: ${domain}\n- Auth: ${auth}\n- Nama Server: ${nama_server}\n- Quota: ${quota}\n- Limit IP: ${iplimit}\n- Batas Create Akun: ${batas_create_akun}\n- Harga: Rp ${harga}`, { parse_mode: 'Markdown' });
        }
      });
    } catch (error) {
      console.error('Error saat menambahkan server:', error);
      await ctx.reply('❌ *Terjadi kesalahan saat menambahkan server baru.*', { parse_mode: 'Markdown' });
    }
    delete userState[ctx.chat.id];
  }
});


bot.action('addserver', async (ctx) => {
  try {
    console.log('📥 Proses tambah server dimulai');
    await ctx.answerCbQuery();
    await ctx.reply('🌐 *Silakan masukkan domain/ip server:*', { parse_mode: 'Markdown' });
    userState[ctx.chat.id] = { step: 'addserver' };
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses tambah server:', error);
    await ctx.reply('❌ *GAGAL! Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.*', { parse_mode: 'Markdown' });
  }
});
bot.action('detailserver', async (ctx) => {
  try {
    console.log('📋 Proses detail server dimulai');
    await ctx.answerCbQuery();
    
    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Server', [], (err, servers) => {
        if (err) {
          console.error('⚠️ Kesalahan saat mengambil detail server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil detail server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      console.log('⚠️ Tidak ada server yang tersedia');
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia saat ini.*', { parse_mode: 'Markdown' });
    }

    const buttons = [];
    for (let i = 0; i < servers.length; i += 2) {
      const row = [];
      row.push({
        text: `${servers[i].nama_server}`,
        callback_data: `server_detail_${servers[i].id}`
      });
      if (i + 1 < servers.length) {
        row.push({
          text: `${servers[i + 1].nama_server}`,
          callback_data: `server_detail_${servers[i + 1].id}`
        });
      }
      buttons.push(row);
    }

    await ctx.reply('📋 *Silakan pilih server untuk melihat detail:*', {
      reply_markup: { inline_keyboard: buttons },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('⚠️ Kesalahan saat mengambil detail server:', error);
    await ctx.reply('⚠️ *Terjadi kesalahan saat mengambil detail server.*', { parse_mode: 'Markdown' });
  }
});

bot.action('listserver', async (ctx) => {
  try {
    console.log('📜 Proses daftar server dimulai');
    await ctx.answerCbQuery();
    
    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Server', [], (err, servers) => {
        if (err) {
          console.error('⚠️ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      console.log('⚠️ Tidak ada server yang tersedia');
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia saat ini.*', { parse_mode: 'Markdown' });
    }

    let serverList = '📜 *Daftar Server* 📜\n\n';
    servers.forEach((server, index) => {
      serverList += `🔹 ${index + 1}. ${server.domain}\n`;
    });

    serverList += `\nTotal Jumlah Server: ${servers.length}`;

    await ctx.reply(serverList, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('⚠️ Kesalahan saat mengambil daftar server:', error);
    await ctx.reply('⚠️ *Terjadi kesalahan saat mengambil daftar server.*', { parse_mode: 'Markdown' });
  }
});
bot.action('resetdb', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply('🚨 *PERHATIAN! Anda akan menghapus semua server yang tersedia. Apakah Anda yakin?*', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Ya', callback_data: 'confirm_resetdb' }],
          [{ text: '❌ Tidak', callback_data: 'cancel_resetdb' }]
        ]
      },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Error saat memulai proses reset database:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('confirm_resetdb', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM Server', (err) => {
        if (err) {
          console.error('❌ Error saat mereset tabel Server:', err.message);
          return reject('❗️ *PERHATIAN! Terjadi KESALAHAN SERIUS saat mereset database. Harap segera hubungi administrator!*');
        }
        resolve();
      });
    });
    await ctx.reply('🚨 *PERHATIAN! Database telah DIRESET SEPENUHNYA. Semua server telah DIHAPUS TOTAL.*', { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Error saat mereset database:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('cancel_resetdb', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply('❌ *Proses reset database dibatalkan.*', { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Error saat membatalkan reset database:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('deleteserver', async (ctx) => {
  try {
    console.log('🗑️ Proses hapus server dimulai');
    await ctx.answerCbQuery();
    
    db.all('SELECT * FROM Server', [], (err, servers) => {
      if (err) {
        console.error('⚠️ Kesalahan saat mengambil daftar server:', err.message);
        return ctx.reply('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*', { parse_mode: 'Markdown' });
      }

      if (servers.length === 0) {
        console.log('⚠️ Tidak ada server yang tersedia');
        return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia saat ini.*', { parse_mode: 'Markdown' });
      }

      const keyboard = servers.map(server => {
        return [{ text: server.nama_server, callback_data: `confirm_delete_server_${server.id}` }];
      });
      keyboard.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'kembali_ke_menu' }]);

      ctx.reply('🗑️ *Pilih server yang ingin dihapus:*', {
        reply_markup: {
          inline_keyboard: keyboard
        },
        parse_mode: 'Markdown'
      });
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses hapus server:', error);
    await ctx.reply('❌ *GAGAL! Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.*', { parse_mode: 'Markdown' });
  }
});


bot.action('cek_saldo', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT saldo FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          console.error('❌ Kesalahan saat memeriksa saldo:', err.message);
          return reject('❌ *Terjadi kesalahan saat memeriksa saldo Anda. Silakan coba lagi nanti.*');
        }
        resolve(row);
      });
    });

    if (row) {
      await ctx.reply(`💳 *Saldo Anda saat ini adalah:* Rp${row.saldo}\n🆔 *ID Anda:* ${userId}`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('⚠️ *Anda belum memiliki saldo. Silakan tambahkan saldo terlebih dahulu.*', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('❌ Kesalahan saat memeriksa saldo:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
const getUsernameById = async (userId) => {
  try {
    const telegramUser = await bot.telegram.getChat(userId);
    return telegramUser.username || telegramUser.first_name;
  } catch (err) {
    console.error('❌ Kesalahan saat mengambil username dari Telegram:', err.message);
    throw new Error('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil username dari Telegram.*');
  }
};

bot.action('addsaldo_user', async (ctx) => {
  try {
    console.log('Add saldo user process started');
    await ctx.answerCbQuery();

    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, user_id FROM Users LIMIT 20', [], (err, users) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar user.*');
        }
        resolve(users);
      });
    });

    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
        if (err) {
          console.error('❌ Kesalahan saat menghitung total user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat menghitung total user.*');
        }
        resolve(row.count);
      });
    });

    const buttons = [];
    for (let i = 0; i < users.length; i += 2) {
      const row = [];
      const username1 = await getUsernameById(users[i].user_id);
      row.push({
        text: username1 || users[i].user_id,
        callback_data: `add_saldo_${users[i].id}`
      });
      if (i + 1 < users.length) {
        const username2 = await getUsernameById(users[i + 1].user_id);
        row.push({
          text: username2 || users[i + 1].user_id,
          callback_data: `add_saldo_${users[i + 1].id}`
        });
      }
      buttons.push(row);
    }

    const currentPage = 0; // Halaman saat ini
    const replyMarkup = {
      inline_keyboard: [...buttons]
    };

    if (totalUsers > 20) {
      replyMarkup.inline_keyboard.push([{
        text: '➡️ Next',
        callback_data: `next_users_${currentPage + 1}`
      }]);
    }

    await ctx.reply('📊 *Silakan pilih user untuk menambahkan saldo:*', {
      reply_markup: replyMarkup,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses tambah saldo user:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action(/next_users_(\d+)/, async (ctx) => {
  const currentPage = parseInt(ctx.match[1]);
  const offset = currentPage * 20; // Menghitung offset berdasarkan halaman saat ini

  try {
    console.log(`Next users process started for page ${currentPage + 1}`);
    await ctx.answerCbQuery();

    const users = await new Promise((resolve, reject) => {
      db.all(`SELECT id, user_id FROM Users LIMIT 20 OFFSET ${offset}`, [], (err, users) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar user.*');
        }
        resolve(users);
      });
    });

    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
        if (err) {
          console.error('❌ Kesalahan saat menghitung total user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat menghitung total user.*');
        }
        resolve(row.count);
      });
    });

    const buttons = [];
    for (let i = 0; i < users.length; i += 2) {
      const row = [];
      const username1 = await getUsernameById(users[i].user_id);
      row.push({
        text: username1 || users[i].user_id,
        callback_data: `add_saldo_${users[i].id}`
      });
      if (i + 1 < users.length) {
        const username2 = await getUsernameById(users[i + 1].user_id);
        row.push({
          text: username2 || users[i + 1].user_id,
          callback_data: `add_saldo_${users[i + 1].id}`
        });
      }
      buttons.push(row);
    }

    const replyMarkup = {
      inline_keyboard: [...buttons]
    };

    // Menambahkan tombol navigasi
    const navigationButtons = [];
    if (currentPage > 0) {
      navigationButtons.push([{
        text: '⬅️ Back',
        callback_data: `prev_users_${currentPage - 1}`
      }]);
    }
    if (offset + 20 < totalUsers) {
      navigationButtons.push([{
        text: '➡️ Next',
        callback_data: `next_users_${currentPage + 1}`
      }]);
    }

    replyMarkup.inline_keyboard.push(...navigationButtons);

    await ctx.editMessageReplyMarkup(replyMarkup);
  } catch (error) {
    console.error('❌ Kesalahan saat memproses next users:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action(/prev_users_(\d+)/, async (ctx) => {
  const currentPage = parseInt(ctx.match[1]);
  const offset = (currentPage - 1) * 20; 

  try {
    console.log(`Previous users process started for page ${currentPage}`);
    await ctx.answerCbQuery();

    const users = await new Promise((resolve, reject) => {
      db.all(`SELECT id, user_id FROM Users LIMIT 20 OFFSET ${offset}`, [], (err, users) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar user.*');
        }
        resolve(users);
      });
    });

    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
        if (err) {
          console.error('❌ Kesalahan saat menghitung total user:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat menghitung total user.*');
        }
        resolve(row.count);
      });
    });

    const buttons = [];
    for (let i = 0; i < users.length; i += 2) {
      const row = [];
      const username1 = await getUsernameById(users[i].user_id);
      row.push({
        text: username1 || users[i].user_id,
        callback_data: `add_saldo_${users[i].id}`
      });
      if (i + 1 < users.length) {
        const username2 = await getUsernameById(users[i + 1].user_id);
        row.push({
          text: username2 || users[i + 1].user_id,
          callback_data: `add_saldo_${users[i + 1].id}`
        });
      }
      buttons.push(row);
    }

    const replyMarkup = {
      inline_keyboard: [...buttons]
    };

    const navigationButtons = [];
    if (currentPage > 0) {
      navigationButtons.push([{
        text: '⬅️ Back',
        callback_data: `prev_users_${currentPage - 1}`
      }]);
    }
    if (offset + 20 < totalUsers) {
      navigationButtons.push([{
        text: '➡️ Next',
        callback_data: `next_users_${currentPage}`
      }]);
    }

    replyMarkup.inline_keyboard.push(...navigationButtons);

    await ctx.editMessageReplyMarkup(replyMarkup);
  } catch (error) {
    console.error('❌ Kesalahan saat memproses previous users:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('editserver_limit_ip', async (ctx) => {
  try {
    console.log('Edit server limit IP process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_limit_ip_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('📊 *Silakan pilih server untuk mengedit limit IP:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit limit IP server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('editserver_batas_create_akun', async (ctx) => {
  try {
    console.log('Edit server batas create akun process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_batas_create_akun_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('📊 *Silakan pilih server untuk mengedit batas create akun:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit batas create akun server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('editserver_total_create_akun', async (ctx) => {
  try {
    console.log('Edit server total create akun process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_total_create_akun_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('📊 *Silakan pilih server untuk mengedit total create akun:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit total create akun server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('editserver_quota', async (ctx) => {
  try {
    console.log('Edit server quota process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_quota_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('📊 *Silakan pilih server untuk mengedit quota:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit quota server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});
bot.action('editserver_auth', async (ctx) => {
  try {
    console.log('Edit server auth process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_auth_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('🌐 *Silakan pilih server untuk mengedit auth:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit auth server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('editserver_harga', async (ctx) => {
  try {
    console.log('Edit server harga process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_harga_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('💰 *Silakan pilih server untuk mengedit harga:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit harga server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('editserver_domain', async (ctx) => {
  try {
    console.log('Edit server domain process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_domain_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('🌐 *Silakan pilih server untuk mengedit domain:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit domain server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('nama_server_edit', async (ctx) => {
  try {
    console.log('Edit server nama process started');
    await ctx.answerCbQuery();

    const servers = await new Promise((resolve, reject) => {
      db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
        if (err) {
          console.error('❌ Kesalahan saat mengambil daftar server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil daftar server.*');
        }
        resolve(servers);
      });
    });

    if (servers.length === 0) {
      return ctx.reply('⚠️ *PERHATIAN! Tidak ada server yang tersedia untuk diedit.*', { parse_mode: 'Markdown' });
    }

    const buttons = servers.map(server => ({
      text: server.nama_server,
      callback_data: `edit_nama_${server.id}`
    }));

    const inlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      inlineKeyboard.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('🏷️ *Silakan pilih server untuk mengedit nama:*', {
      reply_markup: { inline_keyboard: inlineKeyboard },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses edit nama server:', error);
    await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
  }
});

bot.action('topup_saldo', async (ctx) => {
  try {
    await ctx.answerCbQuery(); 
    const userId = ctx.from.id;
    console.log(`🔍 User ${userId} memulai proses top-up saldo.`);
    

    if (!global.depositState) {
      global.depositState = {};
    }
    global.depositState[userId] = { action: 'request_amount', amount: '' };
    
    console.log(`🔍 User ${userId} diminta untuk memasukkan jumlah nominal saldo.`);
    

    const keyboard = keyboard_nomor();
    
    await ctx.reply('💰 *Silakan masukkan jumlah nominal saldo yang Anda ingin tambahkan ke akun Anda:*', {
      reply_markup: {
        inline_keyboard: keyboard
      },
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Kesalahan saat memulai proses top-up saldo:', error);
    await ctx.reply('❌ *GAGAL! Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.*', { parse_mode: 'Markdown' });
  }
});

bot.action(/edit_harga_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit harga server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_harga', serverId: serverId };

  await ctx.reply('💰 *Silakan masukkan harga server baru:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/add_saldo_(\d+)/, async (ctx) => {
  const userId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk menambahkan saldo user dengan ID: ${userId}`);
  userState[ctx.chat.id] = { step: 'add_saldo', userId: userId };

  await ctx.reply('📊 *Silakan masukkan jumlah saldo yang ingin ditambahkan:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_batas_create_akun_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit batas create akun server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_batas_create_akun', serverId: serverId };

  await ctx.reply('📊 *Silakan masukkan batas create akun server baru:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_total_create_akun_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit total create akun server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_total_create_akun', serverId: serverId };

  await ctx.reply('📊 *Silakan masukkan total create akun server baru:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_limit_ip_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit limit IP server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_limit_ip', serverId: serverId };

  await ctx.reply('📊 *Silakan masukkan limit IP server baru:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_quota_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit quota server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_quota', serverId: serverId };

  await ctx.reply('📊 *Silakan masukkan quota server baru:*', {
    reply_markup: { inline_keyboard: keyboard_nomor() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_auth_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit auth server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_auth', serverId: serverId };

  await ctx.reply('🌐 *Silakan masukkan auth server baru:*', {
    reply_markup: { inline_keyboard: keyboard_full() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_domain_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit domain server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_domain', serverId: serverId };

  await ctx.reply('🌐 *Silakan masukkan domain server baru:*', {
    reply_markup: { inline_keyboard: keyboard_full() },
    parse_mode: 'Markdown'
  });
});
bot.action(/edit_nama_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  console.log(`User ${ctx.from.id} memilih untuk mengedit nama server dengan ID: ${serverId}`);
  userState[ctx.chat.id] = { step: 'edit_nama', serverId: serverId };

  await ctx.reply('🏷️ *Silakan masukkan nama server baru:*', {
    reply_markup: { inline_keyboard: keyboard_abc() },
    parse_mode: 'Markdown'
  });
});
bot.action(/confirm_delete_server_(\d+)/, async (ctx) => {
  try {
    db.run('DELETE FROM Server WHERE id = ?', [ctx.match[1]], function(err) {
      if (err) {
        console.error('Error deleting server:', err.message);
        return ctx.reply('⚠️ *PERHATIAN! Terjadi kesalahan saat menghapus server.*', { parse_mode: 'Markdown' });
      }

      if (this.changes === 0) {
        console.log('Server tidak ditemukan');
        return ctx.reply('⚠️ *PERHATIAN! Server tidak ditemukan.*', { parse_mode: 'Markdown' });
      }

      console.log(`Server dengan ID ${ctx.match[1]} berhasil dihapus`);
      ctx.reply('✅ *Server berhasil dihapus.*', { parse_mode: 'Markdown' });
    });
  } catch (error) {
    console.error('Kesalahan saat menghapus server:', error);
    await ctx.reply('❌ *GAGAL! Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.*', { parse_mode: 'Markdown' });
  }
});
bot.action(/server_detail_(\d+)/, async (ctx) => {
  const serverId = ctx.match[1];
  try {
    const server = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
        if (err) {
          console.error('⚠️ Kesalahan saat mengambil detail server:', err.message);
          return reject('⚠️ *PERHATIAN! Terjadi kesalahan saat mengambil detail server.*');
        }
        resolve(server);
      });
    });

    if (!server) {
      console.log('⚠️ Server tidak ditemukan');
      return ctx.reply('⚠️ *PERHATIAN! Server tidak ditemukan.*', { parse_mode: 'Markdown' });
    }

    const serverDetails = `📋 *Detail Server* 📋\n\n` +
      `🌐 *Domain:* \`${server.domain}\`\n` +
      `🔑 *Auth:* \`${server.auth}\`\n` +
      `🏷️ *Nama Server:* \`${server.nama_server}\`\n` +
      `📊 *Quota:* \`${server.quota}\`\n` +
      `📶 *Limit IP:* \`${server.iplimit}\`\n` +
      `🔢 *Batas Create Akun:* \`${server.batas_create_akun}\`\n` +
      `📋 *Total Create Akun:* \`${server.total_create_akun}\`\n` +
      `💵 *Harga:* \`Rp ${server.harga}\`\n\n`;

    await ctx.reply(serverDetails, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('⚠️ Kesalahan saat mengambil detail server:', error);
    await ctx.reply('⚠️ *Terjadi kesalahan saat mengambil detail server.*', { parse_mode: 'Markdown' });
  }
});

bot.on('callback_query', async (ctx) => {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const userStateData = userState[ctx.chat.id];

  if (global.depositState && global.depositState[userId] && global.depositState[userId].action === 'request_amount') {
    await handleDepositState(ctx, userId, data);
  } else if (userStateData) {
    switch (userStateData.step) {
      case 'add_saldo':
        await handleAddSaldo(ctx, userStateData, data);
        break;
      case 'edit_batas_create_akun':
        await handleEditBatasCreateAkun(ctx, userStateData, data);
        break;
      case 'edit_limit_ip':
        await handleEditiplimit(ctx, userStateData, data);
        break;
      case 'edit_quota':
        await handleEditQuota(ctx, userStateData, data);
        break;
      case 'edit_auth':
        await handleEditAuth(ctx, userStateData, data);
        break;
      case 'edit_domain':
        await handleEditDomain(ctx, userStateData, data);
        break;
      case 'edit_harga':
        await handleEditHarga(ctx, userStateData, data);
        break;
      case 'edit_nama':
        await handleEditNama(ctx, userStateData, data);
        break;
      case 'edit_total_create_akun':
        await handleEditTotalCreateAkun(ctx, userStateData, data);
        break;
    }
  }
});


async function handleDepositState(ctx, userId, data) {
  let currentAmount = global.depositState[userId].amount;

  if (data === 'delete') {
    currentAmount = currentAmount.slice(0, -1);
  } else if (data === 'confirm') {
    if (currentAmount.length === 0) {
      return await ctx.answerCbQuery('⚠️ Jumlah tidak boleh kosong!', { show_alert: true });
    }
    if (parseInt(currentAmount) < 200) {
      return await ctx.answerCbQuery('⚠️ Jumlah minimal adalah 200 perak!', { show_alert: true });
    }
    global.depositState[userId].action = 'confirm_amount';
    await processDeposit(ctx, currentAmount);
    return;
  } else {
    if (currentAmount.length < 12) {
      currentAmount += data;
    } else {
      return await ctx.answerCbQuery('⚠️ Jumlah maksimal adalah 12 digit!', { show_alert: true });
    }
  }

  global.depositState[userId].amount = currentAmount;
  const newMessage = `💰 *Silakan masukkan jumlah nominal saldo yang Anda ingin tambahkan ke akun Anda:*\n\nJumlah saat ini: *Rp ${currentAmount}*`;
  if (newMessage !== ctx.callbackQuery.message.text) {
    await ctx.editMessageText(newMessage, {
      reply_markup: { inline_keyboard: keyboard_nomor() },
      parse_mode: 'Markdown'
    });
  }
}

async function handleAddSaldo(ctx, userStateData, data) {
  let currentSaldo = userStateData.saldo || '';

  if (data === 'delete') {
    currentSaldo = currentSaldo.slice(0, -1);
  } else if (data === 'confirm') {
    if (currentSaldo.length === 0) {
      return await ctx.answerCbQuery('⚠️ *Jumlah saldo tidak boleh kosong!*', { show_alert: true });
    }

    try {
      await updateUserSaldo(userStateData.userId, currentSaldo);
      ctx.reply(`✅ *Saldo user berhasil ditambahkan.*\n\n📄 *Detail Saldo:*\n- Jumlah Saldo: *Rp ${currentSaldo}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply('❌ *Terjadi kesalahan saat menambahkan saldo user.*', { parse_mode: 'Markdown' });
    }
    delete userState[ctx.chat.id];
    return;
  } else {
    if (!/^[0-9]+$/.test(data)) {
      return await ctx.answerCbQuery('⚠️ *Jumlah saldo tidak valid!*', { show_alert: true });
    }
    if (currentSaldo.length < 10) {
      currentSaldo += data;
    } else {
      return await ctx.answerCbQuery('⚠️ *Jumlah saldo maksimal adalah 10 karakter!*', { show_alert: true });
    }
  }

  userStateData.saldo = currentSaldo;
  const newMessage = `📊 *Silakan masukkan jumlah saldo yang ingin ditambahkan:*\n\nJumlah saldo saat ini: *${currentSaldo}*`;
  if (newMessage !== ctx.callbackQuery.message.text) {
    await ctx.editMessageText(newMessage, {
      reply_markup: { inline_keyboard: keyboard_nomor() },
      parse_mode: 'Markdown'
    });
  }
}

async function handleEditBatasCreateAkun(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'batasCreateAkun', 'batas create akun', 'UPDATE Server SET batas_create_akun = ? WHERE id = ?');
}

async function handleEditTotalCreateAkun(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'totalCreateAkun', 'total create akun', 'UPDATE Server SET total_create_akun = ? WHERE id = ?');
}

async function handleEditiplimit(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'iplimit', 'limit IP', 'UPDATE Server SET limit_ip = ? WHERE id = ?');
}

async function handleEditQuota(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'quota', 'quota', 'UPDATE Server SET quota = ? WHERE id = ?');
}

async function handleEditAuth(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'auth', 'auth', 'UPDATE Server SET auth = ? WHERE id = ?');
}

async function handleEditDomain(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'domain', 'domain', 'UPDATE Server SET domain = ? WHERE id = ?');
}

async function handleEditHarga(ctx, userStateData, data) {
  let currentAmount = userStateData.amount || '';

  if (data === 'delete') {
    currentAmount = currentAmount.slice(0, -1);
  } else if (data === 'confirm') {
    if (currentAmount.length === 0) {
      return await ctx.answerCbQuery('⚠️ *Jumlah tidak boleh kosong!*', { show_alert: true });
    }
    const hargaBaru = parseFloat(currentAmount);
    if (isNaN(hargaBaru) || hargaBaru <= 0) {
      return ctx.reply('❌ *Harga tidak valid. Masukkan angka yang valid.*', { parse_mode: 'Markdown' });
    }
    try {
      await updateServerField(userStateData.serverId, hargaBaru, 'UPDATE Server SET harga = ? WHERE id = ?');
      ctx.reply(`✅ *Harga server berhasil diupdate.*\n\n📄 *Detail Server:*\n- Harga Baru: *Rp ${hargaBaru}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply('❌ *Terjadi kesalahan saat mengupdate harga server.*', { parse_mode: 'Markdown' });
    }
    delete userState[ctx.chat.id];
    return;
  } else {
    if (!/^\d+$/.test(data)) {
      return await ctx.answerCbQuery('⚠️ *Hanya angka yang diperbolehkan!*', { show_alert: true });
    }
    if (currentAmount.length < 12) {
      currentAmount += data;
    } else {
      return await ctx.answerCbQuery('⚠️ *Jumlah maksimal adalah 12 digit!*', { show_alert: true });
    }
  }

  userStateData.amount = currentAmount;
  const newMessage = `💰 *Silakan masukkan harga server baru:*\n\nJumlah saat ini: *Rp ${currentAmount}*`;
  if (newMessage !== ctx.callbackQuery.message.text) {
    await ctx.editMessageText(newMessage, {
      reply_markup: { inline_keyboard: keyboard_nomor() },
      parse_mode: 'Markdown'
    });
  }
}

async function handleEditNama(ctx, userStateData, data) {
  await handleEditField(ctx, userStateData, data, 'name', 'nama server', 'UPDATE Server SET nama_server = ? WHERE id = ?');
}

async function handleEditField(ctx, userStateData, data, field, fieldName, query) {
  let currentValue = userStateData[field] || '';

  if (data === 'delete') {
    currentValue = currentValue.slice(0, -1);
  } else if (data === 'confirm') {
    if (currentValue.length === 0) {
      return await ctx.answerCbQuery(`⚠️ *${fieldName} tidak boleh kosong!*`, { show_alert: true });
    }
    try {
      await updateServerField(userStateData.serverId, currentValue, query);
      ctx.reply(`✅ *${fieldName} server berhasil diupdate.*\n\n📄 *Detail Server:*\n- ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: *${currentValue}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply(`❌ *Terjadi kesalahan saat mengupdate ${fieldName} server.*`, { parse_mode: 'Markdown' });
    }
    delete userState[ctx.chat.id];
    return;
  } else {
    if (!/^[a-zA-Z0-9.-]+$/.test(data)) {
      return await ctx.answerCbQuery(`⚠️ *${fieldName} tidak valid!*`, { show_alert: true });
    }
    if (currentValue.length < 253) {
      currentValue += data;
    } else {
      return await ctx.answerCbQuery(`⚠️ *${fieldName} maksimal adalah 253 karakter!*`, { show_alert: true });
    }
  }

  userStateData[field] = currentValue;
  const newMessage = `📊 *Silakan masukkan ${fieldName} server baru:*\n\n${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} saat ini: *${currentValue}*`;
  if (newMessage !== ctx.callbackQuery.message.text) {
    await ctx.editMessageText(newMessage, {
      reply_markup: { inline_keyboard: keyboard_nomor() },
      parse_mode: 'Markdown'
    });
  }
}
async function updateUserSaldo(userId, saldo) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE Users SET saldo = saldo + ? WHERE id = ?', [saldo, userId], function (err) {
      if (err) {
        console.error('⚠️ Kesalahan saat menambahkan saldo user:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function updateServerField(serverId, value, query) {
  return new Promise((resolve, reject) => {
    db.run(query, [value, serverId], function (err) {
      if (err) {
        console.error(`⚠️ Kesalahan saat mengupdate ${fieldName} server:`, err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

global.depositState = {};
let lastRequestTime = 0;
const requestInterval = 1000; 
async function processDeposit(ctx, amount) {
  const currentTime = Date.now();
  
  if (currentTime - lastRequestTime < requestInterval) {
      return ctx.reply('⚠️ *Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mencoba lagi.*', { parse_mode: 'Markdown' });
  }

  lastRequestTime = currentTime;
  const userId = ctx.from.id;
  const uniqueCode = `user-${userId}-${Date.now()}`;
  const key = PAYDISINI_KEY;
  const service = '11';
  const note = 'Deposit saldo';
  const validTime = '1800';
  const typeFee = '1';
  const signatureString = `${key}${uniqueCode}${service}${amount}${validTime}NewTransaction`;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  console.log('🔍 Membuat signature untuk transaksi:', signatureString);

  if (!global.pendingDeposits) {
    global.pendingDeposits = {};
  }
  global.pendingDeposits[uniqueCode] = { amount, userId };

  try {
    const response = await axios.post('https://api.paydisini.co.id/v1/', new URLSearchParams({
      key,
      request: 'new',
      unique_code: uniqueCode,
      service,
      amount: amount,
      note,
      valid_time: validTime,
      type_fee: typeFee,
      payment_guide: true,
      signature,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    console.log('🔍 Mengirim permintaan deposit ke PayDisini:', response.config.data);

    if (response.data.success) {
      const { data } = response.data;
      const qrcodeUrl = data.qrcode_url;

      await ctx.replyWithPhoto(qrcodeUrl, {
        caption: `🌟 *Informasi Deposit Anda* 🌟\n\n💼 *Jumlah:* Rp ${amount}\n🎉 *Segera selesaikan pembayaran Anda untuk menikmati saldo baru!*`,
        parse_mode: 'Markdown'
      });
      console.log(`✅ Permintaan deposit berhasil untuk user ${userId}, jumlah: Rp ${amount}`);
    } else {
      console.error('⚠️ Permintaan deposit gagal:', response.data.message);
      await ctx.reply(`⚠️ *Permintaan deposit gagal:* ${response.data.message}`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('❌ Kesalahan saat mengirim permintaan deposit:', error);
    await ctx.reply('❌ *Terjadi kesalahan saat mengirim permintaan deposit. Silakan coba lagi nanti.*', { parse_mode: 'Markdown' });
  } finally {

    delete global.depositState[userId];
  }
}

function keyboard_abc() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const buttons = [];
  for (let i = 0; i < alphabet.length; i += 3) {
    const row = alphabet.slice(i, i + 3).split('').map(char => ({
      text: char,
      callback_data: char
    }));
    buttons.push(row);
  }
  buttons.push([{ text: '🔙 Hapus', callback_data: 'delete' }, { text: '✅ Konfirmasi', callback_data: 'confirm' }]);
  buttons.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]);
  return buttons;
}

function keyboard_nomor() {
  const alphabet = '1234567890';
  const buttons = [];
  for (let i = 0; i < alphabet.length; i += 3) {
    const row = alphabet.slice(i, i + 3).split('').map(char => ({
      text: char,
      callback_data: char
    }));
    buttons.push(row);
  }
  buttons.push([{ text: '🔙 Hapus', callback_data: 'delete' }, { text: '✅ Konfirmasi', callback_data: 'confirm' }]);
  buttons.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]);
  return buttons;
}

function keyboard_full() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const buttons = [];
  for (let i = 0; i < alphabet.length; i += 3) {
    const row = alphabet.slice(i, i + 3).split('').map(char => ({
      text: char,
      callback_data: char
    }));
    buttons.push(row);
  }
  buttons.push([{ text: '🔙 Hapus', callback_data: 'delete' }, { text: '✅ Konfirmasi', callback_data: 'confirm' }]);
  buttons.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]);
  return buttons;
}

const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const crypto = require('crypto');
const { Telegraf, Scenes, session } = require('telegraf');

const app = express();
const axios = require('axios');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createssh, createvmess, createvless, createtrojan, createshadowsocks } = require('./modules/create');
const { renewssh, renewvmess, renewvless, renewtrojan, renewshadowsocks } = require('./modules/renew');

const fs = require('fs');
const vars = JSON.parse(fs.readFileSync('./.vars.json', 'utf8'));

const PAYDISINI_KEY = vars.PAYDISINI_KEY;
const BOT_TOKEN = vars.BOT_TOKEN;
const port = vars.PORT || 50123;
const ADMIN = vars.USER_ID;
const NAMA_STORE = vars.NAMA_STORE || '@FTVPNSTORES';
const bot = new Telegraf(BOT_TOKEN);
const adminIds = ADMIN;
console.log('Bot initialized');

const db = new sqlite3.Database('./sellvpn.db', (err) => {
    if (err) {
        console.error('SQLite3 connection error:', err.message);
    } else {
        console.log('Connected to SQLite3');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS Server (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT,
  auth TEXT,
  harga INTEGER,
  nama_server TEXT,
  quota INTEGER,
  iplimit INTEGER,
  batas_create_akun INTEGER,
  total_create_akun INTEGER
)`, (err) => {
    if (err) {
        console.error('Error creating Server table:', err.message);
    } else {
        console.log('Server table created or already exists');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  saldo INTEGER DEFAULT 0,
  CONSTRAINT unique_user_id UNIQUE (user_id)
)`, (err) => {
    if (err) {
        console.error('Error creating users table:', err.message);
    } else {
        console.log('Users table created or already exists');
    }
});

const userState = {};
console.log('User state initialized');

bot.command(['start', 'menu'], async (ctx) => {
    console.log('Start or Menu command received');

    const userId = ctx.from.id;
    db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Error checking user_id:', err.message);
            return;
        }

        if (row) {
            console.log(`User ID ${userId} already exists in the database`);
        } else {
            db.run('INSERT INTO users (user_id) VALUES (?)', [userId], (err) => {
                if (err) {
                    console.error('Error saving user_id:', err.message);
                } else {
                    console.log(`User ID ${userId} successfully saved`);
                }
            });
        }
    });

    await sendMainMenu(ctx);
});

bot.command('admin', async (ctx) => {
    console.log('Admin menu requested');

    if (!adminIds.includes(ctx.from.id)) {
        await ctx.reply('🚫 You do not have permission to access the admin menu.');
        return;
    }

    await sendAdminMenu(ctx);
});
async function sendMainMenu(ctx) {
    const keyboard = [
        [
            { text: '➕ Create Account', callback_data: 'service_create' },
            { text: '♻️ Renew Account', callback_data: 'service_renew' }
        ],
        [
            { text: '💰 TopUp Balance', callback_data: 'topup_saldo' },
            { text: '💳 Check Balance', callback_data: 'cek_saldo' }
        ],
    ];

    const uptime = os.uptime();
    const days = Math.floor(uptime / (60 * 60 * 24));

    let jumlahServer = 0;
    try {
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS count FROM Server', (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        jumlahServer = row.count;
    } catch (err) {
        console.error('Error fetching server count:', err.message);
    }
    let jumlahPengguna = 0;
    try {
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        jumlahPengguna = row.count;
    } catch (err) {
        console.error('Error fetching user count:', err.message);
    }

    const messageText = `*Welcome to ${NAMA_STORE},
Powered by FTVPN* 🚀
An all-in-one VPN bot for easy and fast VPN service purchase.
Enjoy the convenience and speed of our VPN service with our bot!

⏳ *Bot Uptime:* ${days} Days
🌐 *Available Servers:* ${jumlahServer}
👥 *User Count:* ${jumlahPengguna}

*Please choose a service option:*`;

    try {
        await ctx.editMessageText(messageText, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
        console.log('Main menu sent');
    } catch (error) {
        if (error.response && error.response.error_code === 400) {
            // If the message cannot be edited, send a new message
            await ctx.reply(messageText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            console.log('Main menu sent as new message');
        } else {
            console.error('Error sending main menu:', error);
        }
    }
}
bot.command('helpadmin', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const helpMessage = `
*📋 Admin Command List:*

1. /addserver - Add a new server.
2. /addsaldo - Add balance to a user account.
3. /editharga - Edit service prices.
4. /editnama - Edit server name.
5. /editdomain - Edit server domain. 
6. /editauth - Edit auth server.
7. /editlimitquota - Edit server quota limit.
8. /editlimitip - Edit server IP limit.
9. /editlimitcreate - Edit server account creation limit.
10. /edittotalcreate - Edit total account creation on the server.
11. /broadcast - Send a broadcast message to all users.

Use these commands in the correct format to avoid errors.
`;

    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

bot.command('broadcast', async (ctx) => {
    const userId = ctx.message.from.id;
    console.log(`Broadcast command received from user_id: ${userId}`);
    if (!adminIds.includes(userId)) {
        console.log(`⚠️ User ${userId} does not have permission to use this command.`);
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const message = ctx.message.reply_to_message ? ctx.message.reply_to_message.text : ctx.message.text.split(' ').slice(1).join(' ');
    if (!message) {
        console.log('⚠️ Message to broadcast not provided.');
        return ctx.reply('⚠️ Please provide a message to broadcast.', { parse_mode: 'Markdown' });
    }

    db.all("SELECT user_id FROM users", [], (err, rows) => {
        if (err) {
            console.error('⚠️ Error retrieving user list:', err.message);
            return ctx.reply('⚠️ Error retrieving user list.', { parse_mode: 'Markdown' });
        }

        rows.forEach((row) => {
            const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
            axios.post(telegramUrl, {
                chat_id: row.user_id,
                text: message
            }).then(() => {
                console.log(`✅ Broadcast message sent successfully to ${row.user_id}`);
            }).catch((error) => {
                console.error(`⚠️ Error sending broadcast message to ${row.user_id}`, error.message);
            });
        });

        ctx.reply('✅ Broadcast message sent successfully.', { parse_mode: 'Markdown' });
    });
});
bot.command('addsaldo', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/addsaldo <user_id> <amount>`', { parse_mode: 'Markdown' });
    }

    const targetUserId = parseInt(args[1]);
    const amount = parseInt(args[2]);

    if (isNaN(targetUserId) || isNaN(amount)) {
        return ctx.reply('⚠️ `user_id` and `amount` must be numbers.', { parse_mode: 'Markdown' });
    }

    if (/\s/.test(args[1]) || /\./.test(args[1]) || /\s/.test(args[2]) || /\./.test(args[2])) {
        return ctx.reply('⚠️ `user_id` and `amount` cannot contain spaces or periods.', { parse_mode: 'Markdown' });
    }

    db.get("SELECT * FROM users WHERE user_id = ?", [targetUserId], (err, row) => {
        if (err) {
            console.error('⚠️ Error checking `user_id`:', err.message);
            return ctx.reply('⚠️ Error checking `user_id`.', { parse_mode: 'Markdown' });
        }

        if (!row) {
            return ctx.reply('⚠️ `user_id` not registered.', { parse_mode: 'Markdown' });
        }

        db.run("UPDATE users SET saldo = saldo + ? WHERE user_id = ?", [amount, targetUserId], function (err) {
            if (err) {
                console.error('⚠️ Error adding balance:', err.message);
                return ctx.reply('⚠️ Error adding balance.', { parse_mode: 'Markdown' });
            }

            if (this.changes === 0) {
                return ctx.reply('⚠️ User not found.', { parse_mode: 'Markdown' });
            }

            ctx.reply(`✅ Balance of \`${amount}\` successfully added for \`user_id\` \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
        });
    });
});
bot.command('addserver', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 7) {
        return ctx.reply('⚠️ Incorrect format. Use: `/addserver <domain> <auth> <price> <server_name> <quota> <iplimit> <account_creation_limit>`', { parse_mode: 'Markdown' });
    }

    const [domain, auth, price, server_name, quota, iplimit, account_creation_limit] = args.slice(1);

    const numberOnlyRegex = /^\d+$/;
    if (!numberOnlyRegex.test(price) || !numberOnlyRegex.test(quota) || !numberOnlyRegex.test(iplimit) || !numberOnlyRegex.test(account_creation_limit)) {
        return ctx.reply('⚠️ `price`, `quota`, `iplimit`, and `account_creation_limit` must be numbers.', { parse_mode: 'Markdown' });
    }

    db.run("INSERT INTO Server (domain, auth, price, server_name, quota, iplimit, account_creation_limit) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [domain, auth, parseInt(price), server_name, parseInt(quota), parseInt(iplimit), parseInt(account_creation_limit)], function (err) {
            if (err) {
                console.error('⚠️ Error adding server:', err.message);
                return ctx.reply('⚠️ Error adding server.', { parse_mode: 'Markdown' });
            }

            ctx.reply(`✅ Server \`${server_name}\` successfully added.`, { parse_mode: 'Markdown' });
        });
});
bot.command('editharga', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editharga <domain> <price>`', { parse_mode: 'Markdown' });
    }

    const [domain, price] = args.slice(1);

    if (!/^\d+$/.test(price)) {
        return ctx.reply('⚠️ `price` must be a number.', { parse_mode: 'Markdown' });
    }

    db.run("UPDATE Server SET price = ? WHERE domain = ?", [parseInt(price), domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server price:', err.message);
            return ctx.reply('⚠️ Error editing server price.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server \`${domain}\` price successfully changed to \`${price}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editnama', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editnama <domain> <server_name>`', { parse_mode: 'Markdown' });
    }

    const [domain, server_name] = args.slice(1);

    db.run("UPDATE Server SET server_name = ? WHERE domain = ?", [server_name, domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server name:', err.message);
            return ctx.reply('⚠️ Error editing server name.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server \`${domain}\` name successfully changed to \`${server_name}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editdomain', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editdomain <old_domain> <new_domain>`', { parse_mode: 'Markdown' });
    }

    const [old_domain, new_domain] = args.slice(1);

    db.run("UPDATE Server SET domain = ? WHERE domain = ?", [new_domain, old_domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server domain:', err.message);
            return ctx.reply('⚠️ Error editing server domain.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server domain \`${old_domain}\` has been successfully changed to \`${new_domain}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editauth', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editauth <domain> <auth>`', { parse_mode: 'Markdown' });
    }

    const [domain, auth] = args.slice(1);
    db.run("UPDATE Server SET auth = ? WHERE domain = ?", [auth, domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server auth:', err.message);
            return ctx.reply('⚠️ Error editing server auth.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server auth \`${domain}\` has been successfully changed to \`${auth}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editlimitquota', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editlimitquota <domain> <quota>`', { parse_mode: 'Markdown' });
    }

    const [domain, quota] = args.slice(1);
    if (!/^\d+$/.test(quota)) {
        return ctx.reply('⚠️ `quota` must be a number.', { parse_mode: 'Markdown' });
    }

    db.run("UPDATE Server SET quota = ? WHERE domain = ?", [parseInt(quota), domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server quota:', err.message);
            return ctx.reply('⚠️ Error editing server quota.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server quota \`${domain}\` has been successfully changed to \`${quota}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editlimitip', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editlimitip <domain> <iplimit>`', { parse_mode: 'Markdown' });
    }

    const [domain, iplimit] = args.slice(1);
    if (!/^\d+$/.test(iplimit)) {
        return ctx.reply('⚠️ `iplimit` must be a number.', { parse_mode: 'Markdown' });
    }

    db.run("UPDATE Server SET iplimit = ? WHERE domain = ?", [parseInt(iplimit), domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing server iplimit:', err.message);
            return ctx.reply('⚠️ Error editing server iplimit.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Server iplimit \`${domain}\` has been successfully changed to \`${iplimit}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('editlimitcreate', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/editlimitcreate <domain> <create_account_limit>`', { parse_mode: 'Markdown' });
    }

    const [domain, create_account_limit] = args.slice(1);
    if (!/^\d+$/.test(create_account_limit)) {
        return ctx.reply('⚠️ `create_account_limit` must be a number.', { parse_mode: 'Markdown' });
    }

    db.run("UPDATE Server SET create_account_limit = ? WHERE domain = ?", [parseInt(create_account_limit), domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing create_account_limit server:', err.message);
            return ctx.reply('⚠️ Error editing create_account_limit server.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Create account limit for server \`${domain}\` has been successfully changed to \`${create_account_limit}\`.`, { parse_mode: 'Markdown' });
    });
});

bot.command('edittotalcreate', async (ctx) => {
    const userId = ctx.message.from.id;
    if (!adminIds.includes(userId)) {
        return ctx.reply('⚠️ You do not have permission to use this command.', { parse_mode: 'Markdown' });
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('⚠️ Incorrect format. Use: `/edittotalcreate <domain> <total_create_accounts>`', { parse_mode: 'Markdown' });
    }

    const [domain, total_create_accounts] = args.slice(1);
    if (!/^\d+$/.test(total_create_accounts)) {
        return ctx.reply('⚠️ `total_create_accounts` must be a number.', { parse_mode: 'Markdown' });
    }

    db.run("UPDATE Server SET total_create_accounts = ? WHERE domain = ?", [parseInt(total_create_accounts), domain], function (err) {
        if (err) {
            console.error('⚠️ Error editing total_create_accounts server:', err.message);
            return ctx.reply('⚠️ Error editing total_create_accounts server.', { parse_mode: 'Markdown' });
        }

        if (this.changes === 0) {
            return ctx.reply('⚠️ Server not found.', { parse_mode: 'Markdown' });
        }

        ctx.reply(`✅ Total create accounts for server \`${domain}\` has been successfully changed to \`${total_create_accounts}\`.`, { parse_mode: 'Markdown' });
    });
});

async function handleServiceAction(ctx, action) {
    let keyboard;
    if (action === 'create') {
        keyboard = [
            [{ text: 'Create Ssh/Ovpn', callback_data: 'create_ssh' }],
            [{ text: 'Create Vmess', callback_data: 'create_vmess' }],
            [{ text: 'Create Vless', callback_data: 'create_vless' }],
            [{ text: 'Create Trojan', callback_data: 'create_trojan' }],
            [{ text: 'Create Shadowsocks', callback_data: 'create_shadowsocks' }],
            [{ text: '🔙 Back', callback_data: 'send_main_menu' }]
        ];
    } else if (action === 'renew') {
        keyboard = [
            [{ text: 'Renew Ssh/Ovpn', callback_data: 'renew_ssh' }],
            [{ text: 'Renew Vmess', callback_data: 'renew_vmess' }],
            [{ text: 'Renew Vless', callback_data: 'renew_vless' }],
            [{ text: 'Renew Trojan', callback_data: 'renew_trojan' }],
            [{ text: 'Renew Shadowsocks', callback_data: 'renew_shadowsocks' }],
            [{ text: '🔙 Back', callback_data: 'send_main_menu' }]
        ];
    }
    try {
        await ctx.editMessageReplyMarkup({
            inline_keyboard: keyboard
        });
        console.log(`${action} service menu sent`);
    } catch (error) {
        if (error.response && error.response.error_code === 400) {
            // If the message cannot be edited, send a new message
            await ctx.reply(`Choose the type of service you want to ${action}:`, {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            console.log(`${action} service menu sent as new message`);
        } else {
            console.error(`Error sending ${action} menu:`, error);
        }
    }
}

async function sendAdminMenu(ctx) {
    const adminKeyboard = [
        [
            { text: '➕ Add Server', callback_data: 'addserver' },
            { text: '❌ Delete Server', callback_data: 'deleteserver' }
        ],
        [
            { text: '💲 Edit Price', callback_data: 'editserver_harga' },
            { text: '📝 Edit Name', callback_data: 'nama_server_edit' }
        ],
        [
            { text: '🌐 Edit Domain', callback_data: 'editserver_domain' },
            { text: '🔑 Edit Auth', callback_data: 'editserver_auth' }
        ],
        [
            { text: '📊 Edit Quota', callback_data: 'editserver_quota' },
            { text: '📶 Edit IP Limit', callback_data: 'editserver_limit_ip' }
        ],
        [
            { text: '🔢 Edit Create Limit', callback_data: 'editserver_batas_create_akun' },
            { text: '🔢 Edit Total Create', callback_data: 'editserver_total_create_akun' }
        ],
        [
            { text: '💵 Add Balance', callback_data: 'addsaldo_user' },
            { text: '📋 List Server', callback_data: 'listserver' }
        ],
        [
            { text: '♻️ Reset Server', callback_data: 'resetdb' },
            { text: 'ℹ️ Server Details', callback_data: 'detailserver' }
        ],
        [
            { text: '🔙 Back', callback_data: 'send_main_menu' }
        ]
    ];

    try {
        await ctx.editMessageReplyMarkup({
            inline_keyboard: adminKeyboard
        });
        console.log('Admin menu sent');
    } catch (error) {
        if (error.response && error.response.error_code === 400) {
            // If the message cannot be edited, send a new message
            await ctx.reply('Admin Menu:', {
                reply_markup: {
                    inline_keyboard: adminKeyboard
                }
            });
            console.log('Admin menu sent as new message');
        } else {
            console.error('Error sending admin menu:', error);
        }
    }
}

bot.action('service_create', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await handleServiceAction(ctx, 'create');
});

bot.action('service_renew', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await handleServiceAction(ctx, 'renew');
});

bot.action('send_main_menu', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await sendMainMenu(ctx);
});

bot.action('create_vmess', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'create', 'vmess');
});

bot.action('create_vless', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'create', 'vless');
});

bot.action('create_trojan', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'create', 'trojan');
});

bot.action('create_shadowsocks', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'create', 'shadowsocks');
});

bot.action('create_ssh', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'create', 'ssh');
});

bot.action('renew_vmess', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'renew', 'vmess');
});

bot.action('renew_vless', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'renew', 'vless');
});

bot.action('renew_trojan', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'renew', 'trojan');
});

bot.action('renew_shadowsocks', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'renew', 'shadowsocks');
});

bot.action('renew_ssh', async (ctx) => {
    if (!ctx || !ctx.match) {
        return ctx.reply('❌ *FAILED!* An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
    await startSelectServer(ctx, 'renew', 'ssh');
});
async function startSelectServer(ctx, action, type, page = 0) {
    try {
        console.log(`Starting ${action} process for ${type} on page ${page + 1}`);

        db.all('SELECT * FROM Server', [], (err, servers) => {
            if (err) {
                console.error('⚠️ Error fetching servers:', err.message);
                return ctx.reply('⚠️ *WARNING!* No servers are currently available. Please try again later!', { parse_mode: 'Markdown' });
            }

            if (servers.length === 0) {
                console.log('No servers available');
                return ctx.reply('⚠️ *WARNING!* No servers are currently available. Please try again later!', { parse_mode: 'Markdown' });
            }

            const serversPerPage = 6;
            const totalPages = Math.ceil(servers.length / serversPerPage);
            const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
            const start = currentPage * serversPerPage;
            const end = start + serversPerPage;
            const currentServers = servers.slice(start, end);

            const keyboard = [];
            for (let i = 0; i < currentServers.length; i += 2) {
                const row = [];
                const server1 = currentServers[i];
                const server2 = currentServers[i + 1];
                const server1Text = `${server1.nama_server}`;
                row.push({ text: server1Text, callback_data: `${action}_username_${type}_${server1.id}` });

                if (server2) {
                    const server2Text = `${server2.nama_server}`;
                    row.push({ text: server2Text, callback_data: `${action}_username_${type}_${server2.id}` });
                }
                keyboard.push(row);
            }

            const navButtons = [];
            if (totalPages > 1) {
                if (currentPage > 0) {
                    navButtons.push({ text: '⬅️ Back', callback_data: `navigate_${action}_${type}_${currentPage - 1}` });
                }
                if (currentPage < totalPages - 1) {
                    navButtons.push({ text: '➡️ Next', callback_data: `navigate_${action}_${type}_${currentPage + 1}` });
                }
            }
            if (navButtons.length > 0) {
                keyboard.push(navButtons);
            }
            keyboard.push([{ text: '🔙 Back to Main Menu', callback_data: 'send_main_menu' }]);

            const serverList = currentServers.map(server => {
                const pricePer30Days = server.harga * 30;
                const isFull = server.total_create_akun >= server.batas_create_akun;
                return `🌐 *${server.nama_server}*\n` +
                    `💰 Price per day: Rp${server.harga}\n` +
                    `📅 Price per 30 days: Rp${pricePer30Days}\n` +
                    `📊 Quota: ${server.quota}GB\n` +
                    `🔢 IP Limit: ${server.iplimit} IP\n` +
                    (isFull ? `⚠️ *Server Full*` : `👥 Total Create Account: ${server.total_create_akun}/${server.batas_create_akun}`);
            }).join('\n\n');

            if (ctx.updateType === 'callback_query') {
                ctx.editMessageText(`📋 *List of Servers (Page ${currentPage + 1} of ${totalPages}):*\n\n${serverList}`, {
                    reply_markup: {
                        inline_keyboard: keyboard
                    },
                    parse_mode: 'Markdown'
                });
            } else {
                ctx.reply(`📋 *List of Servers (Page ${currentPage + 1} of ${totalPages}):*\n\n${serverList}`, {
                    reply_markup: {
                        inline_keyboard: keyboard
                    },
                    parse_mode: 'Markdown'
                });
            }
            userState[ctx.chat.id] = { step: `${action}_username_${type}`, page: currentPage };
        });
    } catch (error) {
        console.error(`❌ Error while starting the process ${action} for ${type}:`, error);
        await ctx.reply(`❌ *FAILED!* An error occurred while processing your request. Please try again later.`, { parse_mode: 'Markdown' });
    }
}

bot.action(/navigate_(\w+)_(\w+)_(\d+)/, async (ctx) => {
    const [, action, type, page] = ctx.match;
    await startSelectServer(ctx, action, type, parseInt(page, 10));
});
bot.action(/(create|renew)_username_(vmess|vless|trojan|shadowsocks|ssh)_(.+)/, async (ctx) => {
    const action = ctx.match[1];
    const type = ctx.match[2];
    const serverId = ctx.match[3];
    userState[ctx.chat.id] = { step: `username_${action}_${type}`, serverId, type, action };

    db.get('SELECT batas_create_akun, total_create_akun FROM Server WHERE id = ?', [serverId], async (err, server) => {
        if (err) {
            console.error('⚠️ Error fetching server details:', err.message);
            return ctx.reply('❌ *An error occurred while fetching server details.*', { parse_mode: 'Markdown' });
        }

        if (!server) {
            return ctx.reply('❌ *Server not found.*', { parse_mode: 'Markdown' });
        }

        const batasCreateAkun = server.batas_create_akun;
        const totalCreateAkun = server.total_create_akun;

        if (totalCreateAkun >= batasCreateAkun) {
            return ctx.reply('❌ *Server is full. Cannot create new accounts on this server.*', { parse_mode: 'Markdown' });
        }

        await ctx.reply('👤 *Enter username:*', { parse_mode: 'Markdown' });
    });
});
bot.on('text', async (ctx) => {
    const state = userState[ctx.chat.id];

    if (!state) return;

    if (state.step.startsWith('username_')) {
        state.username = ctx.message.text.trim();
        if (!state.username) {
            return ctx.reply('❌ *Invalid username. Please enter a valid username.*', { parse_mode: 'Markdown' });
        }
        if (state.username.length < 3 || state.username.length > 20) {
            return ctx.reply('❌ *Username must be between 3 and 20 characters.*', { parse_mode: 'Markdown' });
        }
        if (/[^a-zA-Z0-9]/.test(state.username)) {
            return ctx.reply('❌ *Username cannot contain special characters or spaces.*', { parse_mode: 'Markdown' });
        }
        const { username, serverId, type, action } = state;
        if (action === 'create') {
            if (type === 'ssh') {
                state.step = `password_${state.action}_${state.type}`;
                await ctx.reply('🔑 *Enter password:*', { parse_mode: 'Markdown' });
            } else {
                state.step = `exp_${state.action}_${state.type}`;
                await ctx.reply('⏳ *Enter duration (days):*', { parse_mode: 'Markdown' });
            }
        } else if (action === 'renew') {
            state.step = `exp_${state.action}_${state.type}`;
            await ctx.reply('⏳ *Enter duration (days):*', { parse_mode: 'Markdown' });
        }
    } else if (state.step.startsWith('password_')) {
        state.password = ctx.message.text.trim();
        if (!state.password) {
            return ctx.reply('❌ *Invalid password. Please enter a valid password.*', { parse_mode: 'Markdown' });
        }
        if (state.password.length < 6) {
            return ctx.reply('❌ *Password must be at least 6 characters long.*', { parse_mode: 'Markdown' });
        }
        if (/[^a-zA-Z0-9]/.test(state.password)) {
            return ctx.reply('❌ *Password cannot contain special characters or spaces.*', { parse_mode: 'Markdown' });
        }
        state.step = `exp_${state.action}_${state.type}`;
        await ctx.reply('⏳ *Enter duration (days):*', { parse_mode: 'Markdown' });
    } else if (state.step.startsWith('exp_')) {
        const expInput = ctx.message.text.trim();
        if (!/^\d+$/.test(expInput)) {
            return ctx.reply('❌ *Invalid duration. Please enter a valid number.*', { parse_mode: 'Markdown' });
        }
        const exp = parseInt(expInput, 10);
        if (isNaN(exp) || exp <= 0) {
            return ctx.reply('❌ *Invalid duration. Please enter a valid number.*', { parse_mode: 'Markdown' });
        }
        if (exp > 365) {
            return ctx.reply('❌ *Duration cannot be more than 365 days.*', { parse_mode: 'Markdown' });
        }
        state.exp = exp;

        db.get('SELECT quota, iplimit FROM Server WHERE id = ?', [state.serverId], async (err, server) => {
            if (err) {
                console.error('⚠️ Error fetching server details:', err.message);
                return ctx.reply('❌ *An error occurred while fetching server details.*', { parse_mode: 'Markdown' });
            }

            if (!server) {
                return ctx.reply('❌ *Server not found.*', { parse_mode: 'Markdown' });
            }

            state.quota = server.quota;
            state.iplimit = server.iplimit;

            const { username, password, exp, quota, iplimit, serverId, type, action } = state;
            let msg;

            db.get('SELECT harga FROM Server WHERE id = ?', [serverId], async (err, server) => {
                if (err) {
                    console.error('⚠️ Error fetching server price:', err.message);
                    return ctx.reply('❌ *An error occurred while fetching server price.*', { parse_mode: 'Markdown' });
                }

                if (!server) {
                    return ctx.reply('❌ *Server not found.*', { parse_mode: 'Markdown' });
                }

                const harga = server.harga;
                const totalHarga = harga * state.exp;

                db.get('SELECT saldo FROM users WHERE user_id = ?', [ctx.from.id], async (err, user) => {
                    if (err) {
                        console.error('⚠️ Error fetching user balance:', err.message);
                        return ctx.reply('❌ *An error occurred while fetching user balance.*', { parse_mode: 'Markdown' });
                    }

                    if (!user) {
                        return ctx.reply('❌ *User not found.*', { parse_mode: 'Markdown' });
                    }

                    const saldo = user.saldo;

                    if (saldo < totalHarga) {
                        return ctx.reply('❌ *Your balance is insufficient to complete this transaction.*', { parse_mode: 'Markdown' });
                    }
                    if (action === 'create') {
                        if (type === 'vmess') {
                            msg = await createvmess(username, exp, quota, iplimit, serverId);
                        } else if (type === 'vless') {
                            msg = await createvless(username, exp, quota, iplimit, serverId);
                        } else if (type === 'trojan') {
                            msg = await createtrojan(username, exp, quota, iplimit, serverId);
                        } else if (type === 'shadowsocks') {
                            msg = await createshadowsocks(username, exp, quota, iplimit, serverId);
                        } else if (type === 'ssh') {
                            msg = await createssh(username, password, exp, iplimit, serverId);
                        }
                    } else if (action === 'renew') {
                        if (type === 'vmess') {
                            msg = await renewvmess(username, exp, quota, iplimit, serverId);
                        } else if (type === 'vless') {
                            msg = await renewvless(username, exp, quota, iplimit, serverId);
                        } else if (type === 'trojan') {
                            msg = await renewtrojan(username, exp, quota, iplimit, serverId);
                        } else if (type === 'shadowsocks') {
                            msg = await renewshadowsocks(username, exp, quota, iplimit, serverId);
                        } else if (type === 'ssh') {
                            msg = await renewssh(username, exp, iplimit, serverId);
                        }
                    }
                    // Deduct user balance
                    db.run('UPDATE users SET saldo = saldo - ? WHERE user_id = ?', [totalHarga, ctx.from.id], (err) => {
                        if (err) {
                            console.error('⚠️ Error deducting user balance:', err.message);
                            return ctx.reply('❌ *An error occurred while deducting user balance.*', { parse_mode: 'Markdown' });
                        }
                    });
                    // Add total_create_akun
                    db.run('UPDATE Server SET total_create_akun = total_create_akun + 1 WHERE id = ?', [serverId], (err) => {
                        if (err) {
                            console.error('⚠️ Error adding total_create_akun:', err.message);
                            return ctx.reply('❌ *An error occurred while adding total_create_akun.*', { parse_mode: 'Markdown' });
                        }
                    });

                    await ctx.reply(msg, { parse_mode: 'Markdown' });
                    delete userState[ctx.chat.id];
                });
            });
        });
    } else if (state.step === 'addserver') {
        const domain = ctx.message.text.trim();
        if (!domain) {
            await ctx.reply('⚠️ *Domain cannot be empty.* Please enter a valid server domain.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_auth';
        state.domain = domain;
        await ctx.reply('🔑 *Please enter server auth:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_auth') {
        const auth = ctx.message.text.trim();
        if (!auth) {
            await ctx.reply('⚠️ *Auth cannot be empty.* Please enter a valid server auth.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_nama_server';
        state.auth = auth;
        await ctx.reply('🏷️ *Please enter server name:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_nama_server') {
        const nama_server = ctx.message.text.trim();
        if (!nama_server) {
            await ctx.reply('⚠️ *Server name cannot be empty.* Please enter a valid server name.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_quota';
        state.nama_server = nama_server;
        await ctx.reply('📊 *Please enter server quota:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_quota') {
        const quota = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(quota)) {
            await ctx.reply('⚠️ *Quota is invalid.* Please enter a valid server quota.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_iplimit';
        state.quota = quota;
        await ctx.reply('🔢 *Please enter server IP limit:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_iplimit') {
        const iplimit = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(iplimit)) {
            await ctx.reply('⚠️ *IP limit is invalid.* Please enter a valid server IP limit.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_batas_create_akun';
        state.iplimit = iplimit;
        await ctx.reply('🔢 *Please enter server account creation limit:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_batas_create_akun') {
        const batas_create_akun = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(batas_create_akun)) {
            await ctx.reply('⚠️ *Account creation limit is invalid.* Please enter a valid server account creation limit.', { parse_mode: 'Markdown' });
            return;
        }

        state.step = 'addserver_harga';
        state.batas_create_akun = batas_create_akun;
        await ctx.reply('💰 *Please enter server price:*', { parse_mode: 'Markdown' });
    } else if (state.step === 'addserver_harga') {
        const harga = parseFloat(ctx.message.text.trim());
        if (isNaN(harga) || harga <= 0) {
            await ctx.reply('⚠️ *Price is invalid.* Please enter a valid server price.', { parse_mode: 'Markdown' });
            return;
        }
        const { domain, auth, nama_server, quota, iplimit, batas_create_akun } = state;

        try {
            db.run('INSERT INTO Server (domain, auth, nama_server, quota, iplimit, batas_create_akun, harga, total_create_akun) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [domain, auth, nama_server, quota, iplimit, batas_create_akun, harga, 0], function (err) {
                if (err) {
                    console.error('Error while adding server:', err.message);
                    ctx.reply('❌ *An error occurred while adding a new server.*', { parse_mode: 'Markdown' });
                } else {
                    ctx.reply(`✅ *New server with domain ${domain} has been successfully added.*\n\n📄 *Server Details:*\n- Domain: ${domain}\n- Auth: ${auth}\n- Server Name: ${nama_server}\n- Quota: ${quota}\n- IP Limit: ${iplimit}\n- Account Creation Limit: ${batas_create_akun}\n- Price: Rp ${harga}`, { parse_mode: 'Markdown' });
                }
            });
        } catch (error) {
            console.error('Error while adding server:', error);
            await ctx.reply('❌ *An error occurred while adding a new server.*', { parse_mode: 'Markdown' });
        }
        delete userState[ctx.chat.id];
    }
});


bot.action('addserver', async (ctx) => {
    try {
        console.log('📥 Adding server process started');
        await ctx.answerCbQuery();
        await ctx.reply('🌐 *Please enter server domain/IP:*', { parse_mode: 'Markdown' });
        userState[ctx.chat.id] = { step: 'addserver' };
    } catch (error) {
        console.error('❌ Error while starting the add server process:', error);
        await ctx.reply('❌ *FAILED! An error occurred while processing your request. Please try again later.*', { parse_mode: 'Markdown' });
    }
});
bot.action('detailserver', async (ctx) => {
    try {
        console.log('📋 Fetching server details process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('⚠️ Error while fetching server details:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching server details.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            console.log('⚠️ No servers available');
            return ctx.reply('⚠️ *WARNING! No servers are currently available.*', { parse_mode: 'Markdown' });
        }

        const buttons = [];
        for (let i = 0; i < servers.length; i += 2) {
            const row = [];
            row.push({
                text: `${servers[i].nama_server}`,
                callback_data: `server_detail_${servers[i].id}`
            });
            if (i + 1 < servers.length) {
                row.push({
                    text: `${servers[i + 1].nama_server}`,
                    callback_data: `server_detail_${servers[i + 1].id}`
                });
            }
            buttons.push(row);
        }

        await ctx.reply('📋 *Please select a server to view details:*', {
            reply_markup: { inline_keyboard: buttons },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('⚠️ Error while fetching server details:', error);
        await ctx.reply('⚠️ *An error occurred while fetching server details.*', { parse_mode: 'Markdown' });
    }
});

bot.action('listserver', async (ctx) => {
    try {
        console.log('📜 Listing servers process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('⚠️ Error while fetching server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            console.log('⚠️ No servers available');
            return ctx.reply('⚠️ *WARNING! No servers are currently available.*', { parse_mode: 'Markdown' });
        }

        let serverList = '📜 *Server List* 📜\n\n';
        servers.forEach((server, index) => {
            serverList += `🔹 ${index + 1}. ${server.domain}\n`;
        });

        serverList += `\nTotal Number of Servers: ${servers.length}`;

        await ctx.reply(serverList, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('⚠️ Error while fetching server list:', error);
        await ctx.reply('⚠️ *An error occurred while fetching the server list.*', { parse_mode: 'Markdown' });
    }
});
bot.action('resetdb', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.reply('🚨 *WARNING! You are about to delete all available servers. Are you sure?*', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Yes', callback_data: 'confirm_resetdb' }],
                    [{ text: '❌ No', callback_data: 'cancel_resetdb' }]
                ]
            },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the reset database process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('confirm_resetdb', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM Server', (err) => {
                if (err) {
                    console.error('❌ Error while resetting Server table:', err.message);
                    return reject('❗️ *WARNING! A SERIOUS ERROR occurred while resetting the database. Please contact the administrator immediately!*');
                }
                resolve();
            });
        });

        await ctx.reply('🚨 *WARNING! The database has been COMPLETELY RESET. All servers have been TOTALLY DELETED.*', { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Error while resetting database:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('cancel_resetdb', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.reply('❌ *Database reset process has been canceled.*', { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Error while canceling database reset:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('deleteserver', async (ctx) => {
    try {
        console.log('🗑️ Server deletion process started');
        await ctx.answerCbQuery();

        db.all('SELECT * FROM Server', [], (err, servers) => {
            if (err) {
                console.error('⚠️ Error while fetching server list:', err.message);
                return ctx.reply('⚠️ *WARNING! There was an error while fetching the server list.*', { parse_mode: 'Markdown' });
            }

            if (servers.length === 0) {
                console.log('⚠️ No servers available');
                return ctx.reply('⚠️ *WARNING! There are currently no servers available.*', { parse_mode: 'Markdown' });
            }

            const keyboard = servers.map(server => {
                return [{ text: server.nama_server, callback_data: `confirm_delete_server_${server.id}` }];
            });
            keyboard.push([{ text: '🔙 Back to Main Menu', callback_data: 'kembali_ke_menu' }]);

            ctx.reply('🗑️ *Please select the server you want to delete:*', {
                reply_markup: {
                    inline_keyboard: keyboard
                },
                parse_mode: 'Markdown'
            });
        });
    } catch (error) {
        console.error('❌ Error while starting server deletion process:', error);
        await ctx.reply('❌ *FAILED! There was an error processing your request. Please try again later.*', { parse_mode: 'Markdown' });
    }
});


bot.action('cek_saldo', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT saldo FROM users WHERE user_id = ?', [userId], (err, row) => {
                if (err) {
                    console.error('❌ Error while checking balance:', err.message);
                    return reject('❌ *There was an error while checking your balance. Please try again later.*');
                }
                resolve(row);
            });
        });

        if (row) {
            await ctx.reply(`💳 *Your current balance is:* Rp${row.saldo}\n🆔 *Your ID:* ${userId}`, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply('⚠️ *You do not have a balance yet. Please add balance first.*', { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('❌ Error while checking balance:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
const getUsernameById = async (userId) => {
    try {
        const telegramUser = await bot.telegram.getChat(userId);
        return telegramUser.username || telegramUser.first_name;
    } catch (err) {
        console.error('❌ Error while fetching username from Telegram:', err.message);
        throw new Error('⚠️ *WARNING! There was an error while fetching username from Telegram.*');
    }
};

bot.action('addsaldo_user', async (ctx) => {
    try {
        console.log('Add user balance process started');
        await ctx.answerCbQuery();

        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, user_id FROM Users LIMIT 20', [], (err, users) => {
                if (err) {
                    console.error('❌ Error while fetching user list:', err.message);
                    return reject('⚠️ *WARNING! There was an error while fetching user list.*');
                }
                resolve(users);
            });
        });

        const totalUsers = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
                if (err) {
                    console.error('❌ Error while counting total users:', err.message);
                    return reject('⚠️ *WARNING! There was an error while counting total users.*');
                }
                resolve(row.count);
            });
        });

        const buttons = [];
        for (let i = 0; i < users.length; i += 2) {
            const row = [];
            const username1 = await getUsernameById(users[i].user_id);
            row.push({
                text: username1 || users[i].user_id,
                callback_data: `add_saldo_${users[i].id}`
            });
            if (i + 1 < users.length) {
                const username2 = await getUsernameById(users[i + 1].user_id);
                row.push({
                    text: username2 || users[i + 1].user_id,
                    callback_data: `add_saldo_${users[i + 1].id}`
                });
            }
            buttons.push(row);
        }

        const currentPage = 0; // Current page
        const replyMarkup = {
            inline_keyboard: [...buttons]
        };

        if (totalUsers > 20) {
            replyMarkup.inline_keyboard.push([{
                text: '➡️ Next',
                callback_data: `next_users_${currentPage + 1}`
            }]);
        }

        await ctx.reply('📊 *Please select a user to add balance:*', {
            reply_markup: replyMarkup,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting add user balance process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action(/next_users_(\d+)/, async (ctx) => {
    const currentPage = parseInt(ctx.match[1]);
    const offset = currentPage * 20; // Calculate offset based on current page

    try {
        console.log(`Next users process started for page ${currentPage + 1}`);
        await ctx.answerCbQuery();

        const users = await new Promise((resolve, reject) => {
            db.all(`SELECT id, user_id FROM Users LIMIT 20 OFFSET ${offset}`, [], (err, users) => {
                if (err) {
                    console.error('❌ Error while fetching user list:', err.message);
                    return reject('⚠️ *WARNING! There was an error while fetching user list.*');
                }
                resolve(users);
            });
        });

        const totalUsers = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
                if (err) {
                    console.error('❌ Error while counting total users:', err.message);
                    return reject('⚠️ *WARNING! There was an error while counting total users.*');
                }
                resolve(row.count);
            });
        });

        const buttons = [];
        for (let i = 0; i < users.length; i += 2) {
            const row = [];
            const username1 = await getUsernameById(users[i].user_id);
            row.push({
                text: username1 || users[i].user_id,
                callback_data: `add_saldo_${users[i].id}`
            });
            if (i + 1 < users.length) {
                const username2 = await getUsernameById(users[i + 1].user_id);
                row.push({
                    text: username2 || users[i + 1].user_id,
                    callback_data: `add_saldo_${users[i + 1].id}`
                });
            }
            buttons.push(row);
        }

        const replyMarkup = {
            inline_keyboard: [...buttons]
        };
        // Adding navigation buttons
        const navigationButtons = [];
        if (currentPage > 0) {
            navigationButtons.push([{
                text: '⬅️ Back',
                callback_data: `prev_users_${currentPage - 1}`
            }]);
        }
        if (offset + 20 < totalUsers) {
            navigationButtons.push([{
                text: '➡️ Next',
                callback_data: `next_users_${currentPage + 1}`
            }]);
        }

        replyMarkup.inline_keyboard.push(...navigationButtons);

        await ctx.editMessageReplyMarkup(replyMarkup);
    } catch (error) {
        console.error('❌ Error while processing next users:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action(/prev_users_(\d+)/, async (ctx) => {
    const currentPage = parseInt(ctx.match[1]);
    const offset = (currentPage - 1) * 20;

    try {
        console.log(`Previous users process started for page ${currentPage}`);
        await ctx.answerCbQuery();

        const users = await new Promise((resolve, reject) => {
            db.all(`SELECT id, user_id FROM Users LIMIT 20 OFFSET ${offset}`, [], (err, users) => {
                if (err) {
                    console.error('❌ Error while retrieving user list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while retrieving the user list.*');
                }
                resolve(users);
            });
        });

        const totalUsers = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM Users', [], (err, row) => {
                if (err) {
                    console.error('❌ Error while counting total users:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while counting total users.*');
                }
                resolve(row.count);
            });
        });

        const buttons = [];
        for (let i = 0; i < users.length; i += 2) {
            const row = [];
            const username1 = await getUsernameById(users[i].user_id);
            row.push({
                text: username1 || users[i].user_id,
                callback_data: `add_saldo_${users[i].id}`
            });
            if (i + 1 < users.length) {
                const username2 = await getUsernameById(users[i + 1].user_id);
                row.push({
                    text: username2 || users[i + 1].user_id,
                    callback_data: `add_saldo_${users[i + 1].id}`
                });
            }
            buttons.push(row);
        }

        const replyMarkup = {
            inline_keyboard: [...buttons]
        };

        const navigationButtons = [];
        if (currentPage > 0) {
            navigationButtons.push([{
                text: '⬅️ Back',
                callback_data: `prev_users_${currentPage - 1}`
            }]);
        }
        if (offset + 20 < totalUsers) {
            navigationButtons.push([{
                text: '➡️ Next',
                callback_data: `next_users_${currentPage}`
            }]);
        }

        replyMarkup.inline_keyboard.push(...navigationButtons);

        await ctx.editMessageReplyMarkup(replyMarkup);
    } catch (error) {
        console.error('❌ Error while processing previous users:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('editserver_limit_ip', async (ctx) => {
    try {
        console.log('Edit server limit IP process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while retrieving server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while retrieving the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers are available to edit.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.nama_server,
            callback_data: `edit_limit_ip_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('📊 *Please select a server to edit the IP limit:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the edit IP limit server process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('editserver_batas_create_akun', async (ctx) => {
    try {
        console.log('Edit server account creation limit process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while retrieving server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while retrieving the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers are available to edit.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.nama_server,
            callback_data: `edit_batas_create_akun_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('📊 *Please select a server to edit the account creation limit:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the edit account creation limit server process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('editserver_total_create_akun', async (ctx) => {
    try {
        console.log('Edit server total account creation process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, nama_server FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while retrieving server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while retrieving the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers are available to edit.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.nama_server,
            callback_data: `edit_total_create_akun_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('📊 *Please select a server to edit the total account creation:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the total account creation edit process on the server:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('editserver_quota', async (ctx) => {
    try {
        console.log('Edit server quota process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, server_name FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while fetching the server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers available for editing.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.server_name,
            callback_data: `edit_quota_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('📊 *Please select a server to edit the quota:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the server quota edit process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});
bot.action('editserver_auth', async (ctx) => {
    try {
        console.log('Edit server auth process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, server_name FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while fetching the server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers available for editing.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.server_name,
            callback_data: `edit_auth_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('🌐 *Please select a server to edit the auth:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the server auth edit process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('editserver_price', async (ctx) => {
    try {
        console.log('Edit server price process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, server_name FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while fetching the server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers available for editing.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.server_name,
            callback_data: `edit_price_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('💰 *Please select a server to edit the price:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the server price edit process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('editserver_domain', async (ctx) => {
    try {
        console.log('Edit server domain process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, server_name FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while fetching the server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers available for editing.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.server_name,
            callback_data: `edit_domain_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('🌐 *Please select a server to edit the domain:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the server domain edit process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('server_name_edit', async (ctx) => {
    try {
        console.log('Edit server name process started');
        await ctx.answerCbQuery();

        const servers = await new Promise((resolve, reject) => {
            db.all('SELECT id, server_name FROM Server', [], (err, servers) => {
                if (err) {
                    console.error('❌ Error while fetching the server list:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while fetching the server list.*');
                }
                resolve(servers);
            });
        });

        if (servers.length === 0) {
            return ctx.reply('⚠️ *WARNING! No servers available for editing.*', { parse_mode: 'Markdown' });
        }

        const buttons = servers.map(server => ({
            text: server.server_name,
            callback_data: `edit_name_${server.id}`
        }));

        const inlineKeyboard = [];
        for (let i = 0; i < buttons.length; i += 2) {
            inlineKeyboard.push(buttons.slice(i, i + 2));
        }

        await ctx.reply('🏷️ *Please select a server to edit the name:*', {
            reply_markup: { inline_keyboard: inlineKeyboard },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the server name edit process:', error);
        await ctx.reply(`❌ *${error}*`, { parse_mode: 'Markdown' });
    }
});

bot.action('topup_saldo', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const userId = ctx.from.id;
        console.log(`🔍 User ${userId} started the top-up process.`);


        if (!global.depositState) {
            global.depositState = {};
        }
        global.depositState[userId] = { action: 'request_amount', amount: '' };

        console.log(`🔍 User ${userId} prompted to enter the top-up amount.`);


        const keyboard = keyboard_nomor();

        await ctx.reply('💰 *Please enter the amount you want to add to your account:*', {
            reply_markup: {
                inline_keyboard: keyboard
            },
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Error while starting the top-up process:', error);
        await ctx.reply('❌ *FAILED! An error occurred while processing your request. Please try again later.*', { parse_mode: 'Markdown' });
    }
});

bot.action(/edit_harga_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the price of the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_harga', serverId: serverId };

    await ctx.reply('💰 *Please enter the new server price:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/add_saldo_(\d+)/, async (ctx) => {
    const userId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to add balance to user with ID: ${userId}`);
    userState[ctx.chat.id] = { step: 'add_saldo', userId: userId };

    await ctx.reply('📊 *Please enter the amount of balance you want to add:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_batas_create_akun_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the account creation limit for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_batas_create_akun', serverId: serverId };

    await ctx.reply('📊 *Please enter the new account creation limit for the server:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_total_create_akun_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the total account creation for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_total_create_akun', serverId: serverId };

    await ctx.reply('📊 *Please enter the new total account creation for the server:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_limit_ip_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the IP limit for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_limit_ip', serverId: serverId };

    await ctx.reply('📊 *Please enter the new IP limit for the server:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_quota_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the quota for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_quota', serverId: serverId };

    await ctx.reply('📊 *Please enter the new quota for the server:*', {
        reply_markup: { inline_keyboard: keyboard_nomor() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_auth_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the auth for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_auth', serverId: serverId };

    await ctx.reply('🌐 *Please enter the new auth for the server:*', {
        reply_markup: { inline_keyboard: keyboard_full() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_domain_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the domain for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_domain', serverId: serverId };

    await ctx.reply('🌐 *Please enter the new domain for the server:*', {
        reply_markup: { inline_keyboard: keyboard_full() },
        parse_mode: 'Markdown'
    });
});
bot.action(/edit_nama_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    console.log(`User ${ctx.from.id} chose to edit the name for the server with ID: ${serverId}`);
    userState[ctx.chat.id] = { step: 'edit_nama', serverId: serverId };

    await ctx.reply('🏷️ *Please enter the new server name:*', {
        reply_markup: { inline_keyboard: keyboard_abc() },
        parse_mode: 'Markdown'
    });
});
bot.action(/confirm_delete_server_(\d+)/, async (ctx) => {
    try {
        db.run('DELETE FROM Server WHERE id = ?', [ctx.match[1]], function (err) {
            if (err) {
                console.error('Error deleting server:', err.message);
                return ctx.reply('⚠️ *WARNING! An error occurred while deleting the server.*', { parse_mode: 'Markdown' });
            }

            if (this.changes === 0) {
                console.log('Server not found');
                return ctx.reply('⚠️ *WARNING! Server not found.*', { parse_mode: 'Markdown' });
            }

            console.log(`Server with ID ${ctx.match[1]} successfully deleted`);
            ctx.reply('✅ *Server successfully deleted.*', { parse_mode: 'Markdown' });
        });
    } catch (error) {
        console.error('Error while deleting server:', error);
        await ctx.reply('❌ *FAILED! An error occurred while processing your request. Please try again later.*', { parse_mode: 'Markdown' });
    }
});
bot.action(/server_detail_(\d+)/, async (ctx) => {
    const serverId = ctx.match[1];
    try {
        const server = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
                if (err) {
                    console.error('⚠️ Error while retrieving server details:', err.message);
                    return reject('⚠️ *WARNING! An error occurred while retrieving server details.*');
                }
                resolve(server);
            });
        });

        if (!server) {
            console.log('⚠️ Server not found');
            return ctx.reply('⚠️ *WARNING! Server not found.*', { parse_mode: 'Markdown' });
        }

        const serverDetails = `📋 *Server Details* 📋\n\n` +
            `🌐 *Domain:* \`${server.domain}\`\n` +
            `🔑 *Auth:* \`${server.auth}\`\n` +
            `🏷️ *Server Name:* \`${server.nama_server}\`\n` +
            `📊 *Quota:* \`${server.quota}\`\n` +
            `📶 *IP Limit:* \`${server.iplimit}\`\n` +
            `🔢 *Account Creation Limit:* \`${server.batas_create_akun}\`\n` +
            `📋 *Total Account Creation:* \`${server.total_create_akun}\`\n` +
            `💵 *Price:* \`Rp ${server.harga}\`\n\n`;

        await ctx.reply(serverDetails, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('⚠️ Error while retrieving server details:', error);
        await ctx.reply('⚠️ *An error occurred while retrieving server details.*', { parse_mode: 'Markdown' });
    }
});

bot.on('callback_query', async (ctx) => {
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    const userStateData = userState[ctx.chat.id];

    if (global.depositState && global.depositState[userId] && global.depositState[userId].action === 'request_amount') {
        await handleDepositState(ctx, userId, data);
    } else if (userStateData) {
        switch (userStateData.step) {
            case 'add_saldo':
                await handleAddSaldo(ctx, userStateData, data);
                break;
            case 'edit_batas_create_akun':
                await handleEditBatasCreateAkun(ctx, userStateData, data);
                break;
            case 'edit_limit_ip':
                await handleEditiplimit(ctx, userStateData, data);
                break;
            case 'edit_quota':
                await handleEditQuota(ctx, userStateData, data);
                break;
            case 'edit_auth':
                await handleEditAuth(ctx, userStateData, data);
                break;
            case 'edit_domain':
                await handleEditDomain(ctx, userStateData, data);
                break;
            case 'edit_harga':
                await handleEditHarga(ctx, userStateData, data);
                break;
            case 'edit_nama':
                await handleEditNama(ctx, userStateData, data);
                break;
            case 'edit_total_create_akun':
                await handleEditTotalCreateAkun(ctx, userStateData, data);
                break;
        }
    }
});
async function handleDepositState(ctx, userId, data) {
    let currentAmount = global.depositState[userId].amount;

    if (data === 'delete') {
        currentAmount = currentAmount.slice(0, -1);
    } else if (data === 'confirm') {
        if (currentAmount.length === 0) {
            return await ctx.answerCbQuery('⚠️ Amount cannot be empty!', { show_alert: true });
        }
        if (parseInt(currentAmount) < 200) {
            return await ctx.answerCbQuery('⚠️ The minimum amount is 200 perak!', { show_alert: true });
        }
        global.depositState[userId].action = 'confirm_amount';
        await processDeposit(ctx, currentAmount);
        return;
    } else {
        if (currentAmount.length < 12) {
            currentAmount += data;
        } else {
            return await ctx.answerCbQuery('⚠️ The maximum amount is 12 digits!', { show_alert: true });
        }
    }

    global.depositState[userId].amount = currentAmount;
    const newMessage = `💰 *Please enter the nominal amount that you want to add to your account:*\n\nCurrent amount: *Rp ${currentAmount}*`;
    if (newMessage !== ctx.callbackQuery.message.text) {
        await ctx.editMessageText(newMessage, {
            reply_markup: { inline_keyboard: keyboard_nomor() },
            parse_mode: 'Markdown'
        });
    }
}

async function handleAddSaldo(ctx, userStateData, data) {
    let currentSaldo = userStateData.saldo || '';

    if (data === 'delete') {
        currentSaldo = currentSaldo.slice(0, -1);
    } else if (data === 'confirm') {
        if (currentSaldo.length === 0) {
            return await ctx.answerCbQuery('⚠️ *The amount cannot be empty!*', { show_alert: true });
        }

        try {
            await updateUserSaldo(userStateData.userId, currentSaldo);
            ctx.reply(`✅ *User balance has been successfully added.*\n\n📄 *Balance Details:*\n- Balance Amount: *Rp ${currentSaldo}*`, { parse_mode: 'Markdown' });
        } catch (err) {
            ctx.reply('❌ *An error occurred while adding the user balance.*', { parse_mode: 'Markdown' });
        }
        delete userState[ctx.chat.id];
        return;
    } else {
        if (!/^[0-9]+$/.test(data)) {
            return await ctx.answerCbQuery('⚠️ *The balance amount is not valid!*', { show_alert: true });
        }
        if (currentSaldo.length < 10) {
            currentSaldo += data;
        } else {
            return await ctx.answerCbQuery('⚠️ *The maximum balance amount is 10 characters!*', { show_alert: true });
        }
    }

    userStateData.saldo = currentSaldo;
    const newMessage = `📊 *Please enter the amount of balance you want to add:*\n\nCurrent balance: *${currentSaldo}*`;
    if (newMessage !== ctx.callbackQuery.message.text) {
        await ctx.editMessageText(newMessage, {
            reply_markup: { inline_keyboard: keyboard_nomor() },
            parse_mode: 'Markdown'
        });
    }
}

async function handleEditBatasCreateAkun(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'batasCreateAkun', 'account creation limit', 'UPDATE Server SET batas_create_akun = ? WHERE id = ?');
}

async function handleEditTotalCreateAkun(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'totalCreateAkun', 'total account creation', 'UPDATE Server SET total_create_akun = ? WHERE id = ?');
}

async function handleEditiplimit(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'iplimit', 'IP limit', 'UPDATE Server SET limit_ip = ? WHERE id = ?');
}

async function handleEditQuota(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'quota', 'quota', 'UPDATE Server SET quota = ? WHERE id = ?');
}

async function handleEditAuth(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'auth', 'authentication', 'UPDATE Server SET auth = ? WHERE id = ?');
}

async function handleEditDomain(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'domain', 'domain', 'UPDATE Server SET domain = ? WHERE id = ?');
}

async function handleEditHarga(ctx, userStateData, data) {
    let currentAmount = userStateData.amount || '';

    if (data === 'delete') {
        currentAmount = currentAmount.slice(0, -1);
    } else if (data === 'confirm') {
        if (currentAmount.length === 0) {
            return await ctx.answerCbQuery('⚠️ *Amount cannot be empty!*', { show_alert: true });
        }
        const hargaBaru = parseFloat(currentAmount);
        if (isNaN(hargaBaru) || hargaBaru <= 0) {
            return ctx.reply('❌ *Invalid price. Please enter a valid number.*', { parse_mode: 'Markdown' });
        }
        try {
            await updateServerField(userStateData.serverId, hargaBaru, 'UPDATE Server SET harga = ? WHERE id = ?');
            ctx.reply(`✅ *The server price has been successfully updated.*\n\n📄 *Server Details:*\n- New Price: *Rp ${hargaBaru}*`, { parse_mode: 'Markdown' });
        } catch (err) {
            ctx.reply('❌ *An error occurred while updating the server price.*', { parse_mode: 'Markdown' });
        }
        delete userState[ctx.chat.id];
        return;
    } else {
        if (!/^\d+$/.test(data)) {
            return await ctx.answerCbQuery('⚠️ *Only numbers are allowed!*', { show_alert: true });
        }
        if (currentAmount.length < 12) {
            currentAmount += data;
        } else {
            return await ctx.answerCbQuery('⚠️ *The maximum amount is 12 digits!*', { show_alert: true });
        }
    }

    userStateData.amount = currentAmount;
    const newMessage = `💰 *Please enter the new server price:*\n\nCurrent amount: *Rp ${currentAmount}*`;
    if (newMessage !== ctx.callbackQuery.message.text) {
        await ctx.editMessageText(newMessage, {
            reply_markup: { inline_keyboard: keyboard_nomor() },
            parse_mode: 'Markdown'
        });
    }
}

async function handleEditNama(ctx, userStateData, data) {
    await handleEditField(ctx, userStateData, data, 'name', 'server name', 'UPDATE Server SET nama_server = ? WHERE id = ?');
}

async function handleEditField(ctx, userStateData, data, field, fieldName, query) {
    let currentValue = userStateData[field] || '';

    if (data === 'delete') {
        currentValue = currentValue.slice(0, -1);
    } else if (data === 'confirm') {
        if (currentValue.length === 0) {
            return await ctx.answerCbQuery(`⚠️ *${fieldName} cannot be empty!*`, { show_alert: true });
        }
        try {
            await updateServerField(userStateData.serverId, currentValue, query);
            ctx.reply(`✅ *The ${fieldName} has been successfully updated.*\n\n📄 *Server Details:*\n- ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: *${currentValue}*`, { parse_mode: 'Markdown' });
        } catch (err) {
            ctx.reply(`❌ *An error occurred while updating the ${fieldName}.*`, { parse_mode: 'Markdown' });
        }
        delete userState[ctx.chat.id];
        return;
    } else {
        if (!/^[a-zA-Z0-9.-]+$/.test(data)) {
            return await ctx.answerCbQuery(`⚠️ *${fieldName} is not valid!*`, { show_alert: true });
        }
        if (currentValue.length < 253) {
            currentValue += data;
        } else {
            return await ctx.answerCbQuery(`⚠️ *The maximum ${fieldName} length is 253 characters!*`, { show_alert: true });
        }
    }

    userStateData[field] = currentValue;
    const newMessage = `📊 *Please enter the new ${fieldName}:*\n\nCurrent ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: *${currentValue}*`;
    if (newMessage !== ctx.callbackQuery.message.text) {
        await ctx.editMessageText(newMessage, {
            reply_markup: { inline_keyboard: keyboard_nomor() },
            parse_mode: 'Markdown'
        });
    }
}
async function updateUserSaldo(userId, saldo) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE Users SET saldo = saldo + ? WHERE id = ?', [saldo, userId], function (err) {
            if (err) {
                console.error('⚠️ Error while adding user balance:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function updateServerField(serverId, value, query) {
    return new Promise((resolve, reject) => {
        db.run(query, [value, serverId], function (err) {
            if (err) {
                console.error(`⚠️ Error while updating ${fieldName} server:`, err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

global.depositState = {};
let lastRequestTime = 0;
const requestInterval = 1000;
async function processDeposit(ctx, amount) {
    const currentTime = Date.now();

    if (currentTime - lastRequestTime < requestInterval) {
        return ctx.reply('⚠️ *Too many requests. Please wait a moment before trying again.*', { parse_mode: 'Markdown' });
    }

    lastRequestTime = currentTime;
    const userId = ctx.from.id;
    const uniqueCode = `user-${userId}-${Date.now()}`;
    const key = PAYDISINI_KEY;
    const service = '11';
    const note = 'Deposit balance';
    const validTime = '1800';
    const typeFee = '1';
    const signatureString = `${key}${uniqueCode}${service}${amount}${validTime}NewTransaction`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    console.log('🔍 Creating signature for transaction:', signatureString);

    if (!global.pendingDeposits) {
        global.pendingDeposits = {};
    }
    global.pendingDeposits[uniqueCode] = { amount, userId };

    try {
        const response = await axios.post('https://api.paydisini.co.id/v1/', new URLSearchParams({
            key,
            request: 'new',
            unique_code: uniqueCode,
            service,
            amount: amount,
            note,
            valid_time: validTime,
            type_fee: typeFee,
            payment_guide: true,
            signature,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        console.log('🔍 Sending deposit request to PayDisini:', response.config.data);

        if (response.data.success) {
            const { data } = response.data;
            const qrcodeUrl = data.qrcode_url;

            await ctx.replyWithPhoto(qrcodeUrl, {
                caption: `🌟 *Your Deposit Information* 🌟\n\n💼 *Amount:* Rp ${amount}\n🎉 *Please complete your payment to enjoy the new balance!*`,
                parse_mode: 'Markdown'
            });
            console.log(`✅ Deposit request successful for user ${userId}, amount: Rp ${amount}`);
        } else {
            console.error('⚠️ Deposit request failed:', response.data.message);
            await ctx.reply(`⚠️ *Deposit request failed:* ${response.data.message}`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('❌ Error while sending deposit request:', error);
        await ctx.reply('❌ *An error occurred while sending the deposit request. Please try again later.*', { parse_mode: 'Markdown' });
    } finally {
        delete global.depositState[userId];
    }
}

function keyboard_abc() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const buttons = [];
    for (let i = 0; i < alphabet.length; i += 3) {
        const row = alphabet.slice(i, i + 3).split('').map(char => ({
            text: char,
            callback_data: char
        }));
        buttons.push(row);
    }
    buttons.push([{ text: '🔙 Delete', callback_data: 'delete' }, { text: '✅ Confirm', callback_data: 'confirm' }]);
    buttons.push([{ text: '🔙 Back to Main Menu', callback_data: 'send_main_menu' }]);
    return buttons;
}

function keyboard_nomor() {
    const alphabet = '1234567890';
    const buttons = [];
    for (let i = 0; i < alphabet.length; i += 3) {
        const row = alphabet.slice(i, i + 3).split('').map(char => ({
            text: char,
            callback_data: char
        }));
        buttons.push(row);
    }
    buttons.push([{ text: '🔙 Delete', callback_data: 'delete' }, { text: '✅ Confirm', callback_data: 'confirm' }]);
    buttons.push([{ text: '🔙 Back to Main Menu', callback_data: 'send_main_menu' }]);
    return buttons;
}

function keyboard_full() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const buttons = [];
    for (let i = 0; i < alphabet.length; i += 3) {
        const row = alphabet.slice(i, i + 3).split('').map(char => ({
            text: char,
            callback_data: char
        }));
        buttons.push(row);
    }
    buttons.push([{ text: '🔙 Delete', callback_data: 'delete' }, { text: '✅ Confirm', callback_data: 'confirm' }]);
    buttons.push([{ text: '🔙 Back to Main Menu', callback_data: 'send_main_menu' }]);
    return buttons;
}
app.post('/callback/paydisini', async (req, res) => {
    console.log('Request body:', req.body); // Log for debugging
    const { unique_code, status } = req.body;

    if (!unique_code || !status) {
        return res.status(400).send('⚠️ *Invalid request*');
    }

    const depositInfo = global.pendingDeposits[unique_code];
    if (!depositInfo) {
        return res.status(404).send('Amount not found for unique code');
    }

    const amount = depositInfo.amount;
    const userId = depositInfo.userId;

    try {
        const [prefix, user_id] = unique_code.split('-');
        if (prefix !== 'user' || !user_id) {
            return res.status(400).send('Unique code format is invalid');
        }

        if (status === 'Success') {

            db.run("UPDATE users SET saldo = saldo + ? WHERE user_id = ?", [amount, user_id], function (err) {
                if (err) {
                    console.error(`Error updating balance for user_id: ${user_id}, amount: ${JSON.stringify(amount)}`, err.message);
                    return res.status(500).send('Error updating balance');
                }
                console.log(`✅ Balance successfully updated for user_id: ${user_id}, amount: ${JSON.stringify(amount)}`);

                delete global.pendingDeposits[unique_code];

                db.get("SELECT saldo FROM users WHERE user_id = ?", [user_id], (err, row) => {
                    if (err) {
                        console.error('⚠️ Error fetching latest balance:', err.message);
                        return res.status(500).send('⚠️ Error fetching latest balance');
                    }
                    const newSaldo = row.saldo;
                    const message = `✅ Deposit successful!\n\n💰 Amount: Rp ${amount}\n💵 Current balance: Rp ${newSaldo}`;

                    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                    axios.post(telegramUrl, {
                        chat_id: user_id,
                        text: message
                    }).then(() => {
                        console.log(`✅ Deposit confirmation message successfully sent to ${user_id}`);
                        return res.status(200).send('✅ *Balance successfully added*');
                    }).catch((error) => {
                        console.error(`⚠️ Error sending message to Telegram for user_id: ${user_id}`, error.message);
                        return res.status(500).send('⚠️ *Error sending message to Telegram*');
                    });
                });
            });
        } else {
            console.log(`⚠️ Balance addition failed for unique_code: ${unique_code}`);
            return res.status(200).send('⚠️ Balance addition failed');
        }
    } catch (error) {
        console.error('⚠️ Error processing balance addition:', error.message);
        return res.status(500).send('⚠️ Error processing balance addition');
    }
});

app.listen(port, () => {
    bot.launch().then(() => {
        console.log('Bot has started');
    }).catch((error) => {
        console.error('Error starting bot:', error);
    });
    console.log(`Server running on port ${port}`);
});
