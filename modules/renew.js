const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sellvpn.db');

async function renewssh(username, exp, limitip, serverId) {
  console.log(`Renewing SSH account for ${username} with expiry ${exp} days, limit IP ${limitip} on server ${serverId}`);
  
  // Validate username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return '❌ Invalid username. Please use only letters and numbers without spaces.';
  }

  // Retrieve domain from database
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err) {
        console.error('Error fetching server:', err.message);
        return resolve('❌ Server not found. Please try again.');
      }

      if (!server) return resolve('❌ Server not found. Please try again.');

      const domain = server.domain;
      const auth = server.auth;
      const param = `:5888/renewssh?user=${username}&exp=${exp}&iplimit=${limitip}&auth=${auth}`;
      const url = `http://${domain}${param}`;
      axios.get(url)
        .then(response => {
          if (response.data.status === "success") {
            const sshData = response.data.data;
            const msg = `
🌟 *RENEW SSH PREMIUM* 🌟

🔹 *Account Information*
┌─────────────────────────────
│ Username: \`${username}\`
│ Expiry: \`${sshData.exp}\`
│ IP Limit: \`${sshData.limitip} IP\`
└─────────────────────────────
✅ Account ${username} has been successfully renewed
✨ Enjoy our services! ✨
`;
         
              console.log('SSH account renewed successfully');
              return resolve(msg);
            } else {
              console.log('Error renewing SSH account');
              return resolve(`❌ An error occurred: ${response.data.message}`);
            }
          })
        .catch(error => {
          console.error('Error while renewing SSH:', error);
          return resolve('❌ An error occurred while renewing SSH. Please try again later.');
        });
    });
  });
}
async function renewvmess(username, exp, quota, limitip, serverId) {
    console.log(`Renewing VMess account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);
    
    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
      return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }
  
    // Retrieve domain from database
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
        if (err) {
          console.error('Error fetching server:', err.message);
          return resolve('❌ Server not found. Please try again.');
        }
  
        if (!server) return resolve('❌ Server not found. Please try again.');
  
        const domain = server.domain;
        const auth = server.auth;
        const param = `:5888/renewvmess?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
        const url = `http://${domain}${param}`;
        axios.get(url)
          .then(response => {
            if (response.data.status === "success") {
              const vmessData = response.data.data;
              const msg = `
  🌟 *RENEW VMESS PREMIUM* 🌟
  
  🔹 *Account Information*
  ┌─────────────────────────────
  │ Username: \`${username}\`
  │ Expiry: \`${vmessData.exp}\`
  │ Quota: \`${vmessData.quota}\`
  │ IP Limit: \`${vmessData.limitip} IP\`
  └─────────────────────────────
  ✅ Account ${username} has been successfully renewed
  ✨ Enjoy our services! ✨
  `;
                console.log('VMess account renewed successfully');
                return resolve(msg);
              } else {
                console.log('Error renewing VMess account');
                return resolve(`❌ An error occurred: ${response.data.message}`);
              }
            })
          .catch(error => {
            console.error('Error while renewing VMess:', error);
            return resolve('❌ An error occurred while renewing VMess. Please try again later.');
          });
      });
    });
  }
  async function renewvless(username, exp, quota, limitip, serverId) {
    console.log(`Renewing VLess account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);
    
    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
      return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }
  
    // Retrieve domain from database
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
        if (err) {
          console.error('Error fetching server:', err.message);
          return resolve('❌ Server not found. Please try again.');
        }
  
        if (!server) return resolve('❌ Server not found. Please try again.');
  
        const domain = server.domain;
        const auth = server.auth;
        const param = `:5888/renewvless?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
        const url = `http://${domain}${param}`;
        axios.get(url)
          .then(response => {
            if (response.data.status === "success") {
              const vlessData = response.data.data;
              const msg = `
  🌟 *RENEW VLESS PREMIUM* 🌟
  
  🔹 *Account Information*
  ┌─────────────────────────────
  │ Username: \`${username}\`
  │ Expiry: \`${vlessData.exp}\`
  │ Quota: \`${vlessData.quota}\`
  │ IP Limit: \`${vlessData.limitip} IP\`
  └─────────────────────────────
  ✅ Account ${username} has been successfully renewed
  ✨ Enjoy our services! ✨
  `;
           
                console.log('VLess account renewed successfully');
                return resolve(msg);
              } else {
                console.log('Error renewing VLess account');
                return resolve(`❌ An error occurred: ${response.data.message}`);
              }
            })
          .catch(error => {
            console.error('Error while renewing VLess:', error);
            return resolve('❌ An error occurred while renewing VLess. Please try again later.');
          });
      });
    });
  }
  async function renewtrojan(username, exp, quota, limitip, serverId) {
    console.log(`Renewing Trojan account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);
    
    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
      return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }
  
    // Retrieve domain from database
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
        if (err) {
          console.error('Error fetching server:', err.message);
          return resolve('❌ Server not found. Please try again.');
        }
  
        if (!server) return resolve('❌ Server not found. Please try again.');
  
        const domain = server.domain;
        const auth = server.auth;
        const param = `:5888/renewtrojan?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
        const url = `http://${domain}${param}`;
        axios.get(url)
          .then(response => {
            if (response.data.status === "success") {
              const trojanData = response.data.data;
              const msg = `
  🌟 *RENEW TROJAN PREMIUM* 🌟
  
  🔹 *Account Information*
  ┌─────────────────────────────
  │ Username: \`${username}\`
  │ Expiry: \`${trojanData.exp}\`
  │ Quota: \`${trojanData.quota}\`
  │ IP Limit: \`${trojanData.limitip} IP\`
  └─────────────────────────────
  ✅ Account ${username} has been successfully renewed
  ✨ Enjoy our services! ✨
  `;
           
                console.log('Trojan account renewed successfully');
                return resolve(msg);
              } else {
                console.log('Error renewing Trojan account');
                return resolve(`❌ An error occurred: ${response.data.message}`);
              }
            })
          .catch(error => {
            console.error('Error while renewing Trojan:', error);
            return resolve('❌ An error occurred while renewing Trojan. Please try again later.');
          });
      });
    });
  }
  async function renewshadowsocks(username, exp, quota, limitip, serverId) {
    console.log(`Renewing Shadowsocks account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);
    
    // Validate username
    if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
      return '❌ Invalid username. Please use only letters and numbers without spaces.';
    }
  
    // Retrieve domain from database
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
        if (err) {
          console.error('Error fetching server:', err.message);
          return resolve('❌ Server not found. Please try again.');
        }
  
        if (!server) return resolve('❌ Server not found. Please try again.');
  
        const domain = server.domain;
        const auth = server.auth;
        const param = `:5888/renewshadowsocks?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
        const url = `http://${domain}${param}`;
        axios.get(url)
          .then(response => {
            if (response.data.status === "success") {
              const shadowsocksData = response.data.data;
              const msg = `
  🌟 *RENEW SHADOWSOCKS PREMIUM* 🌟
  
  🔹 *Account Information*
  ┌─────────────────────────────
  │ Username: \`${username}\`
  │ Expiry: \`${vmessData.exp}\`
  │ Quota: \`${vmessData.quota}\`
  │ IP Limit: \`${shadowsocksData.limitip} IP\`
  └─────────────────────────────
  ✅ Account ${username} has been successfully renewed
  ✨ Enjoy our services! ✨
  `;
           
                console.log('Shadowsocks account renewed successfully');
                return resolve(msg);
              } else {
                console.log('Error renewing Shadowsocks account');
                return resolve(`❌ An error occurred: ${response.data.message}`);
              }
            })
          .catch(error => {
            console.error('Error while renewing Shadowsocks:', error);
            return resolve('❌ An error occurred while renewing Shadowsocks. Please try again later.');
          });
      });
    });
  }
  
  module.exports = { renewshadowsocks, renewtrojan, renewvless, renewvmess, renewssh };
