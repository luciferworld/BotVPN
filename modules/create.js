const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sellvpn.db');
async function createssh(username, password, exp, iplimit, serverId) {
    console.log(`Creating SSH account for ${username} with expiry ${exp} days, IP limit ${iplimit}, and password ${password}`);

    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
        return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }

    // Get domain from database
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
            if (err) {
                console.error('Error fetching server:', err.message);
                return resolve('❌ Server not found. Please try again.');
            }

            if (!server) return resolve('❌ Server not found. Please try again.');

            const domain = server.domain;
            const auth = server.auth;
            const param = `:5888/createssh?user=${username}&password=${password}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            const url = `http://${domain}${param}`;
            axios.get(url)
                .then(response => {
                    if (response.data.status === "success") {
                        const sshData = response.data.data;
                        const msg = `
🌟 *XyberzVPN PREMIUM SSH ACCOUNT* 🌟

🔹 *Account Information*
┌─────────────────────
│ *Username* : \`${sshData.username}\`
│ *Password* : \`${sshData.password}\`
└─────────────────────
┌─────────────────────
│ *Domain*   : \`${sshData.domain}\`
│ *NS*       : \`${sshData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *OpenSSH*  : \`22\`
│ *UdpSSH*   : \`1-65535\`
│ *DNS*      : \`443, 53, 22\`
│ *Dropbear* : \`443, 109\`
│ *SSH WS*   : \`80\`
│ *SSH SSL WS*: \`443\`
│ *SSL/TLS*  : \`443\`
│ *OVPN SSL* : \`443\`
│ *OVPN TCP* : \`1194\`
│ *OVPN UDP* : \`2200\`
│ *BadVPN UDP*: \`7100, 7300, 7300\`
└─────────────────────
🔒 *PUBKEY*
\`\`\`
${sshData.pubkey}
\`\`\`
🔗 *Link and Payload*
───────────────────────
WSS Payload      : 
\`\`\`
GET wss://BUG.COM/ HTTP/1.1
Host: ${sshData.domain}
Upgrade: websocket
\`\`\`
OpenVPN Link     : [Download OpenVPN](https://${sshData.domain}:81/allovpn.zip)
Save Account Link: [Save Account](https://${sshData.domain}:81/ssh-${sshData.username}.txt)
───────────────────────
┌─────────────────────
│ Expires: \`${sshData.expired}\`
│ IP Limit: \`${sshData.ip_limit}\`
└─────────────────────

✨ Enjoy our services! ✨
`;
                        console.log('SSH account created successfully');
                        return resolve(msg);
                    } else {
                        console.log('Error creating SSH account');
                        return resolve(`❌ An error occurred: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error creating SSH:', error);
                    return resolve('❌ An error occurred while creating SSH. Please try again later.');
                });
        });
    });
}
async function createvmess(username, exp, quota, limitip, serverId) {
    console.log(`Creating VMess account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);

    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
        return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }

    // Get domain and auth from database
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
            if (err) {
                console.error('Error fetching server:', err.message);
                return resolve('❌ Server not found. Please try again.');
            }

            if (!server) return resolve('❌ Server not found. Please try again.');

            const domain = server.domain;
            const auth = server.auth;
            const param = `:5888/createvmess?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
            const url = `http://${domain}${param}`;
            axios.get(url)
                .then(response => {
                    if (response.data.status === "success") {
                        const vmessData = response.data.data;
                        const msg = `
🌟 *XyberzVPN PREMIUM VMESS ACCOUNT* 🌟

🔹 *Account Information*
┌─────────────────────
│ *Username* : \`${vmessData.username}\`
│ *Domain*   : \`${vmessData.domain}\`
│ *NS*       : \`${vmessData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Alter ID* : \`0\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/vmess\`
│ *Path GRPC*: \`vmess-grpc\`
└─────────────────────
🔐 *VMESS TLS URL*
\`\`\`
${vmessData.vmess_tls_link}
\`\`\`
🔓 *VMESS HTTP URL*
\`\`\`
${vmessData.vmess_nontls_link}
\`\`\`
🔒 *VMESS GRPC URL*
\`\`\`
${vmessData.vmess_grpc_link}
\`\`\`
🔒 *UUID & PUBKEY*
\`\`\`
${vmessData.uuid}
\`\`\`
\`\`\`
${vmessData.pubkey}
\`\`\`
┌─────────────────────
│ Expiry: \`${vmessData.expired}\`
│ Quota: \`${vmessData.quota === '0 GB' ? 'Unlimited' : vmessData.quota}\`
│ IP Limit: \`${vmessData.ip_limit === '0' ? 'Unlimited' : vmessData.ip_limit} IP\`
└─────────────────────
Save Account Link: [Save Account](https://${vmessData.domain}:81/vmess-${vmessData.username}.txt)
✨ Enjoy our services! ✨
`;
                        console.log('VMess account created successfully');
                        return resolve(msg);
                    } else {
                        console.log('Error creating VMess account');
                        return resolve(`❌ An error occurred: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error creating VMess:', error);
                    return resolve('❌ An error occurred while creating VMess. Please try again later.');
                });
        });
    });
}
async function createvless(username, exp, quota, limitip, serverId) {
    console.log(`Creating VLESS account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);

    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
        return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }

    // Get domain from database
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
            if (err) {
                console.error('Error fetching server:', err.message);
                return resolve('❌ Server not found. Please try again.');
            }

            if (!server) return resolve('❌ Server not found. Please try again.');

            const domain = server.domain;
            const auth = server.auth;
            const param = `:5888/createvless?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
            const url = `http://${domain}${param}`;
            axios.get(url)
                .then(response => {
                    if (response.data.status === "success") {
                        const vlessData = response.data.data;
                        const msg = `
🌟 *XyberzVPN PREMIUM VLESS ACCOUNT* 🌟

🔹 *Account Information*
┌─────────────────────
│ *Username* : \`${vlessData.username}\`
│ *Domain*   : \`${vlessData.domain}\`
│ *NS*       : \`${vlessData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/vless\`
│ *Path GRPC*: \`vless-grpc\`
└─────────────────────
🔐 *VLESS TLS URL*
\`\`\`
${vlessData.vless_tls_link}
\`\`\`
🔓 *VLESS HTTP URL*
\`\`\`
${vlessData.vless_nontls_link}
\`\`\`
🔒 *VLESS GRPC URL*
\`\`\`
${vlessData.vless_grpc_link}
\`\`\`
🔒 *UUID & PUBKEY*
\`\`\`
${vlessData.uuid}
\`\`\`
\`\`\`
${vlessData.pubkey}
\`\`\`
┌─────────────────────
│ Expiry: \`${vlessData.expired}\`
│ Quota: \`${vlessData.quota === '0 GB' ? 'Unlimited' : vlessData.quota}\`
│ IP Limit: \`${vlessData.ip_limit === '0' ? 'Unlimited' : vlessData.ip_limit} IP\`
└─────────────────────
Save Account Link: [Save Account](https://${vlessData.domain}:81/vless-${vlessData.username}.txt)
✨ Enjoy using our service! ✨
`;
                        console.log('VLESS account created successfully');
                        return resolve(msg);
                    } else {
                        console.log('Error creating VLESS account');
                        return resolve(`❌ An error occurred: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error while creating VLESS:', error);
                    return resolve('❌ An error occurred while creating VLESS. Please try again later.');
                });
        });
    });
}
async function createtrojan(username, exp, quota, limitip, serverId) {
    console.log(`Creating Trojan account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);

    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
        return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }

    // Get domain from database
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
            if (err) {
                console.error('Error fetching server:', err.message);
                return resolve('❌ Server not found. Please try again.');
            }

            if (!server) return resolve('❌ Server not found. Please try again.');

            const domain = server.domain;
            const auth = server.auth;
            const param = `:5888/createtrojan?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
            const url = `http://${domain}${param}`;
            axios.get(url)
                .then(response => {
                    if (response.data.status === "success") {
                        const trojanData = response.data.data;
                        const msg = `
🌟 *XyberzVPN PREMIUM TROJAN ACCOUNT* 🌟

🔹 *Account Information*
┌─────────────────────
│ *Username* : \`${trojanData.username}\`
│ *Domain*   : \`${trojanData.domain}\`
│ *NS*       : \`${trojanData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/trojan-ws\`
│ *Path GRPC*: \`trojan-grpc\`
└─────────────────────
🔐 *TROJAN TLS URL*
\`\`\`
${trojanData.trojan_tls_link}
\`\`\`
🔒 *TROJAN GRPC URL*
\`\`\`
${trojanData.trojan_grpc_link}
\`\`\`
🔒 *PUBKEY*
\`\`\`
${trojanData.pubkey}
\`\`\`
┌─────────────────────
│ Expiry: \`${trojanData.expired}\`
│ Quota: \`${trojanData.quota === '0 GB' ? 'Unlimited' : trojanData.quota}\`
│ IP Limit: \`${trojanData.ip_limit === '0' ? 'Unlimited' : trojanData.ip_limit} IP\`
└─────────────────────
Save Account Link: [Save Account](https://${trojanData.domain}:81/trojan-${trojanData.username}.txt)
✨ Enjoy using our service! ✨
`;
                        console.log('Trojan account created successfully');
                        return resolve(msg);
                    } else {
                        console.log('Error creating Trojan account');
                        return resolve(`❌ An error occurred: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error while creating Trojan:', error);
                    return resolve('❌ An error occurred while creating Trojan. Please try again later.');
                });
        });
    });
}

async function createshadowsocks(username, exp, quota, limitip, serverId) {
    console.log(`Creating Shadowsocks account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);

    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
        return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }

    // Get domain from database
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
            if (err) {
                console.error('Error fetching server:', err.message);
                return resolve('❌ Server not found. Please try again.');
            }

            if (!server) return resolve('❌ Server not found. Please try again.');

            const domain = server.domain;
            const auth = server.auth;
            const param = `:5888/createshadowsocks?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
            const url = `http://${domain}${param}`;
            axios.get(url)
                .then(response => {
                    if (response.data.status === "success") {
                        const shadowsocksData = response.data.data;
                        const msg = `
🌟 *XyberzVPN PREMIUM SHADOWSOCKS ACCOUNT* 🌟

🔹 *Account Information*
┌─────────────────────
│ *Username* : \`${shadowsocksData.username}\`
│ *Domain*   : \`${shadowsocksData.domain}\`
│ *NS*       : \`${shadowsocksData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Alter ID* : \`0\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/shadowsocks\`
│ *Path GRPC*: \`shadowsocks-grpc\`
└─────────────────────
🔐 *SHADOWSOCKS TLS URL*
\`\`\`
${shadowsocksData.ss_link_ws}
\`\`\`
🔒 *SHADOWSOCKS GRPC URL*
\`\`\`
${shadowsocksData.ss_link_grpc}
\`\`\`
🔒 *PUBKEY*
\`\`\`
${shadowsocksData.pubkey}
\`\`\`
┌─────────────────────
│ Expiry: \`${shadowsocksData.expired}\`
│ Quota: \`${shadowsocksData.quota === '0 GB' ? 'Unlimited' : shadowsocksData.quota}\`
│ IP Limit: \`${shadowsocksData.ip_limit === '0' ? 'Unlimited' : shadowsocksData.ip_limit} IP\`
└─────────────────────
Save Account Link: [Save Account](https://${shadowsocksData.domain}:81/shadowsocks-${shadowsocksData.username}.txt)
✨ Enjoy using our service! ✨
`;
                        console.log('Shadowsocks account created successfully');
                        return resolve(msg);
                    } else {
                        console.log('Error creating Shadowsocks account');
                        return resolve(`❌ An error occurred: ${response.data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error while creating Shadowsocks:', error);
                    return resolve('❌ An error occurred while creating Shadowsocks. Please try again later.');
                });
        });
    });
}

module.exports = { createssh, createvmess, createvless, createtrojan, createshadowsocks }; 
