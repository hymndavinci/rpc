const { Client, RichPresence } = require('discord.js-selfbot-v13');
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
let client;

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const TWITCH_URL = process.env.TWITCH_URL || 'https://www.twitch.tv/manish';
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'manish';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'kawai';
const CONFIG_FILE = path.join(__dirname, 'rpc-config.json');
const AFK_LOGS_FILE = path.join(__dirname, 'afk-logs.json');

let isMobileOnline = false;
const loginAttempts = new Map();
const blockedIPs = new Map();
const SESSION_SECRET = 'rpc-dashboard-secret-' + Date.now();

let currentConfig = {
    enabled: false,
    type: 'PLAYING',
    name: 'Custom Activity',
    state: '',
    details: '',
    largeImage: '',
    largeText: '',
    smallImage: '',
    smallText: '',
    startTimestamp: null,
    button1Label: '',
    button1URL: '',
    button2Label: '',
    button2URL: '',
    status: 'online',
    customUsername: '',
    deviceType: 'desktop',
    afkEnabled: false,
    afkMessage: 'I am currently AFK. I will respond when I return.',
    dynamicEnabled: false,
    dynamicInterval: 10,
    dynamicItems: [],
    dynamicIndex: 0
};

let afkLogs = [];

if (fs.existsSync(CONFIG_FILE)) {
    currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

if (fs.existsSync(AFK_LOGS_FILE)) {
    afkLogs = JSON.parse(fs.readFileSync(AFK_LOGS_FILE, 'utf8'));
}

isMobileOnline = currentConfig.deviceType === 'mobile';

let dynamicTimer = null;

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
}

function saveAfkLogs() {
    fs.writeFileSync(AFK_LOGS_FILE, JSON.stringify(afkLogs, null, 2));
}

function initializeClient() {
    client = new Client({
        ws: {
            properties: {
                browser: isMobileOnline ? 'Discord iOS' : 'Discord Client'
            }
        }
    });
    
    client.once('ready', async () => {
        console.log(`✅ Logged in as ${client.user.tag}`);
        
        if (currentConfig.status) {
            await updateStatus(currentConfig.status);
        }
        
        updateRPC();
        startDynamicRotation();
    });

    client.on('messageCreate', async (message) => {
        if (!currentConfig.afkEnabled) return;
        if (message.author.id === client.user.id) return;
        
        if (message.mentions.everyone) return;
        
        const mentionedRoles = message.mentions.roles;
        const userMentions = message.mentions.users;
        
        if (mentionedRoles && mentionedRoles.size > 0) {
            const member = message.guild?.members.cache.get(client.user.id);
            if (member) {
                const hasRoleMention = mentionedRoles.some(role => member.roles.cache.has(role.id));
                if (hasRoleMention && !userMentions.has(client.user.id)) {
                    return;
                }
            }
        }
        
        if (!message.mentions.has(client.user.id)) return;

        try {
            const messageLink = `https://discord.com/channels/${message.guild?.id || '@me'}/${message.channel.id}/${message.id}`;
            
            const logEntry = {
                id: Date.now() + Math.random(),
                serverName: message.guild?.name || 'Direct Message',
                channelName: message.channel.name || 'DM',
                authorUsername: message.author.tag,
                authorId: message.author.id,
                messageLink: messageLink,
                timestamp: new Date().toISOString(),
                content: message.content.substring(0, 100)
            };

            afkLogs.push(logEntry);
            saveAfkLogs();
            
            await message.reply(currentConfig.afkMessage);
            console.log(`📨 AFK reply sent to ${message.author.tag} in ${logEntry.serverName}`);
        } catch (error) {
            console.error('Error handling AFK mention:', error.message);
        }
    });

    client.on('disconnected', () => {
        console.log('❌ Disconnected from Discord');
        setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            client.login(TOKEN);
        }, 5000);
    });

    return client;
}

async function updateRPC() {
    const actualStatus = currentConfig.status === 'offline' ? 'invisible' : (currentConfig.status || 'online');
    
    if (currentConfig.dynamicEnabled && Array.isArray(currentConfig.dynamicItems) && currentConfig.dynamicItems.length > 0) {
        try {
            const item = currentConfig.dynamicItems[currentConfig.dynamicIndex % currentConfig.dynamicItems.length];
            const activity = {
                type: item.type || 'PLAYING',
                application_id: client.user.id,
                name: item.name || 'Custom Activity',
                details: item.details || undefined,
                state: item.state || undefined,
                timestamps: item.startTimestamp ? { start: Date.now() } : undefined,
                assets: {},
                buttons: [],
                metadata: {
                    button_urls: []
                }
            };

            if ((item.type || 'PLAYING') === 'STREAMING') {
                activity.url = TWITCH_URL;
            }

            if (item.largeImage) {
                activity.assets.large_image = item.largeImage;
                if (item.largeText) {
                    activity.assets.large_text = item.largeText;
                }
            }

            if (item.smallImage) {
                activity.assets.small_image = item.smallImage;
                if (item.smallText) {
                    activity.assets.small_text = item.smallText;
                }
            }

            if (Object.keys(activity.assets).length === 0) {
                delete activity.assets;
            }

            if (item.button1Label && item.button1URL) {
                activity.buttons.push(item.button1Label);
                activity.metadata.button_urls.push(item.button1URL);
            }
            
            if (item.button2Label && item.button2URL) {
                activity.buttons.push(item.button2Label);
                activity.metadata.button_urls.push(item.button2URL);
            }

            if (activity.buttons.length === 0) {
                delete activity.buttons;
                delete activity.metadata;
            }

            client.user.setPresence({ 
                activities: [activity],
                status: actualStatus
            });
            return;
        } catch (error) {}
    }

    if (!currentConfig.enabled) {
        client.user.setPresence({ 
            activities: [],
            status: actualStatus
        });
        return;
    }

    try {
        const activity = {
            type: currentConfig.type,
            application_id: client.user.id,
            name: currentConfig.name || 'Custom Activity',
            details: currentConfig.details || undefined,
            state: currentConfig.state || undefined,
            timestamps: currentConfig.startTimestamp ? { start: Date.now() } : undefined,
            assets: {},
            buttons: [],
            metadata: {
                button_urls: []
            }
        };

        if (currentConfig.type === 'STREAMING') {
            activity.url = TWITCH_URL;
        }

        if (currentConfig.largeImage) {
            activity.assets.large_image = currentConfig.largeImage;
            if (currentConfig.largeText) {
                activity.assets.large_text = currentConfig.largeText;
            }
        }

        if (currentConfig.smallImage) {
            activity.assets.small_image = currentConfig.smallImage;
            if (currentConfig.smallText) {
                activity.assets.small_text = currentConfig.smallText;
            }
        }

        if (Object.keys(activity.assets).length === 0) {
            delete activity.assets;
        }

        if (currentConfig.button1Label && currentConfig.button1URL) {
            activity.buttons.push(currentConfig.button1Label);
            activity.metadata.button_urls.push(currentConfig.button1URL);
        }
        
        if (currentConfig.button2Label && currentConfig.button2URL) {
            activity.buttons.push(currentConfig.button2Label);
            activity.metadata.button_urls.push(currentConfig.button2URL);
        }

        if (activity.buttons.length === 0) {
            delete activity.buttons;
            delete activity.metadata;
        }

        client.user.setPresence({ 
            activities: [activity],
            status: actualStatus
        });
        
        console.log(`✅ RPC Updated (Status: ${currentConfig.status} → ${actualStatus})`);

    } catch (error) {
        console.error('❌ Error updating RPC:', error.message);
    }
}

function startDynamicRotation() {
    if (dynamicTimer) {
        clearInterval(dynamicTimer);
        dynamicTimer = null;
    }
    if (!currentConfig.dynamicEnabled || !Array.isArray(currentConfig.dynamicItems) || currentConfig.dynamicItems.length === 0) {
        updateRPC();
        return;
    }
    currentConfig.dynamicIndex = 0;
    updateRPC();
    dynamicTimer = setInterval(() => {
        currentConfig.dynamicIndex = (currentConfig.dynamicIndex + 1) % currentConfig.dynamicItems.length;
        updateRPC();
    }, Math.max(1, parseInt(currentConfig.dynamicInterval || 10, 10)) * 1000);
}

async function updateDisplayName(newDisplayName) {
    try {
        if (!newDisplayName || newDisplayName.trim() === '') {
            console.log('❌ Display name cannot be empty');
            return { success: false, error: 'Display name cannot be empty' };
        }

        await client.user.setGlobalName(newDisplayName);
        console.log(`✅ Display name changed to: ${newDisplayName}`);
        return { success: true, displayName: newDisplayName };
    } catch (error) {
        console.error('❌ Error changing display name:', error.message);
        return { success: false, error: error.message };
    }
}

async function updateStatus(status) {
    try {
        currentConfig.status = status;
        saveConfig();
        
        const actualStatus = status === 'offline' ? 'invisible' : status;
        
        if (currentConfig.enabled) {
            const activity = {
                type: currentConfig.type,
                application_id: client.user.id,
                name: currentConfig.name || 'Custom Activity',
                details: currentConfig.details || undefined,
                state: currentConfig.state || undefined,
                timestamps: currentConfig.startTimestamp ? { start: Date.now() } : undefined,
                assets: {},
                buttons: [],
                metadata: {
                    button_urls: []
                }
            };

            if (currentConfig.type === 'STREAMING') {
                activity.url = TWITCH_URL;
            }

            if (currentConfig.largeImage) {
                activity.assets.large_image = currentConfig.largeImage;
                if (currentConfig.largeText) {
                    activity.assets.large_text = currentConfig.largeText;
                }
            }

            if (currentConfig.smallImage) {
                activity.assets.small_image = currentConfig.smallImage;
                if (currentConfig.smallText) {
                    activity.assets.small_text = currentConfig.smallText;
                }
            }

            if (Object.keys(activity.assets).length === 0) {
                delete activity.assets;
            }

            if (currentConfig.button1Label && currentConfig.button1URL) {
                activity.buttons.push(currentConfig.button1Label);
                activity.metadata.button_urls.push(currentConfig.button1URL);
            }
            
            if (currentConfig.button2Label && currentConfig.button2URL) {
                activity.buttons.push(currentConfig.button2Label);
                activity.metadata.button_urls.push(currentConfig.button2URL);
            }

            if (activity.buttons.length === 0) {
                delete activity.buttons;
                delete activity.metadata;
            }

            client.user.setPresence({ 
                activities: [activity],
                status: actualStatus
            });
        } else {
            client.user.setPresence({ 
                activities: [],
                status: actualStatus
            });
        }
        
        console.log(`✅ Status changed: ${status} → ${actualStatus}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error changing status:', error.message);
        return { success: false, error: error.message };
    }
}

async function switchDevice(deviceType) {
    try {
        const needReconnect = (deviceType === 'mobile' && !isMobileOnline) || 
                            (deviceType === 'desktop' && isMobileOnline);
        
        if (!needReconnect) {
            return { success: true, message: 'Already on ' + deviceType };
        }

        currentConfig.deviceType = deviceType;
        isMobileOnline = deviceType === 'mobile';
        saveConfig();

        console.log('🔄 Switching to ' + deviceType + ' mode...');
        
        await client.destroy();
        
        initializeClient();
        await client.login(TOKEN);

        console.log('✅ Switched to ' + deviceType + ' mode successfully');
        return { success: true, message: 'Switched to ' + deviceType };
    } catch (error) {
        console.error('❌ Error switching device:', error.message);
        return { success: false, error: error.message };
    }
}

function isIPBlocked(ip) {
    if (blockedIPs.has(ip)) {
        const blockTime = blockedIPs.get(ip);
        const now = Date.now();
        if (now - blockTime < 15 * 60 * 1000) {
            return true;
        } else {
            blockedIPs.delete(ip);
            loginAttempts.delete(ip);
            return false;
        }
    }
    return false;
}

function checkAuth(req, res, next) {
    if (req.cookies.auth === SESSION_SECRET) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

app.use(express.json());
app.use(cookieParser());

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (isIPBlocked(ip)) {
        const blockTime = blockedIPs.get(ip);
        const remainingTime = Math.ceil((15 * 60 * 1000 - (Date.now() - blockTime)) / 60000);
        return res.status(403).json({ 
            error: `Too many failed attempts. Try again in ${remainingTime} minutes.` 
        });
    }

    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
        loginAttempts.delete(ip);
        res.cookie('auth', SESSION_SECRET, { 
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true 
        });
        console.log(`✅ Successful login from ${ip}`);
        return res.json({ success: true });
    }

    const attempts = (loginAttempts.get(ip) || 0) + 1;
    loginAttempts.set(ip, attempts);

    if (attempts >= 3) {
        blockedIPs.set(ip, Date.now());
        console.log(`⚠️ IP ${ip} blocked after 3 failed attempts`);
        return res.status(403).json({ 
            error: 'Too many failed attempts. You are blocked for 15 minutes.' 
        });
    }

    console.log(`❌ Failed login attempt ${attempts}/3 from ${ip}`);
    res.status(401).json({ 
        error: `Invalid credentials. ${3 - attempts} attempts remaining.` 
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.cookies.auth === SESSION_SECRET) {
        return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('auth');
    res.json({ success: true });
});

app.use((req, res, next) => {
    if (req.path === '/api/login' || req.path === '/api/check-auth' || req.path === '/login.html') {
        return next();
    }

    if (req.cookies.auth === SESSION_SECRET) {
        return next();
    }

    if (req.path === '/' || req.path === '/index.html') {
        return res.redirect('/login.html');
    }

    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    res.redirect('/login.html');
});

app.use(express.static('public'));

app.get('/dynamic', (req, res) => {
    res.redirect('/dynamic.html');
});

app.get('/api/config', (req, res) => {
    res.json(currentConfig);
});

app.post('/api/config', (req, res) => {
    currentConfig = { ...currentConfig, ...req.body };
    saveConfig();
    updateRPC();
    res.json({ success: true, config: currentConfig });
});

app.post('/api/toggle', (req, res) => {
    currentConfig.enabled = !currentConfig.enabled;
    saveConfig();
    updateRPC();
    res.json({ success: true, enabled: currentConfig.enabled });
});

app.post('/api/username', async (req, res) => {
    const { username } = req.body;
    const result = await updateDisplayName(username);
    res.json(result);
});

app.get('/api/dynamic', (req, res) => {
    res.json({
        dynamicEnabled: currentConfig.dynamicEnabled || false,
        dynamicInterval: currentConfig.dynamicInterval || 10,
        dynamicItems: currentConfig.dynamicItems || [],
        dynamicIndex: currentConfig.dynamicIndex || 0
    });
});

app.post('/api/dynamic/toggle', (req, res) => {
    currentConfig.dynamicEnabled = !currentConfig.dynamicEnabled;
    if (currentConfig.dynamicEnabled) {
        currentConfig.enabled = false;
    }
    saveConfig();
    startDynamicRotation();
    res.json({ success: true, dynamicEnabled: currentConfig.dynamicEnabled });
});

app.post('/api/dynamic/config', (req, res) => {
    const { interval } = req.body;
    const iv = parseInt(interval, 10);
    if (!isNaN(iv) && iv > 0) {
        currentConfig.dynamicInterval = iv;
        saveConfig();
        if (currentConfig.dynamicEnabled) {
            startDynamicRotation();
        } else {
            updateRPC();
        }
        return res.json({ success: true, dynamicInterval: currentConfig.dynamicInterval });
    }
    res.status(400).json({ error: 'Invalid interval' });
});

app.post('/api/dynamic/items', (req, res) => {
    const item = req.body || {};
    if (!Array.isArray(currentConfig.dynamicItems)) currentConfig.dynamicItems = [];
    currentConfig.dynamicItems.push(item);
    saveConfig();
    if (currentConfig.dynamicEnabled) updateRPC();
    res.json({ success: true, dynamicItems: currentConfig.dynamicItems });
});

app.delete('/api/dynamic/items/:index', (req, res) => {
    const idx = parseInt(req.params.index, 10);
    if (Array.isArray(currentConfig.dynamicItems) && idx >= 0 && idx < currentConfig.dynamicItems.length) {
        currentConfig.dynamicItems.splice(idx, 1);
        if (currentConfig.dynamicIndex >= currentConfig.dynamicItems.length) {
            currentConfig.dynamicIndex = 0;
        }
        saveConfig();
        if (currentConfig.dynamicEnabled) startDynamicRotation();
        return res.json({ success: true, dynamicItems: currentConfig.dynamicItems });
    }
    res.status(404).json({ error: 'Item not found' });
});

app.post('/api/status', async (req, res) => {
    const { status } = req.body;
    const result = await updateStatus(status);
    res.json(result);
});

app.post('/api/device', async (req, res) => {
    const { deviceType } = req.body;
    const result = await switchDevice(deviceType);
    res.json(result);
});

app.post('/api/afk/toggle', (req, res) => {
    currentConfig.afkEnabled = !currentConfig.afkEnabled;
    saveConfig();
    console.log(`AFK mode ${currentConfig.afkEnabled ? 'enabled' : 'disabled'}`);
    res.json({ success: true, enabled: currentConfig.afkEnabled });
});

app.post('/api/afk/message', (req, res) => {
    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message cannot be empty' });
    }
    currentConfig.afkMessage = message;
    saveConfig();
    res.json({ success: true, message: currentConfig.afkMessage });
});

app.get('/api/afk/logs', (req, res) => {
    res.json(afkLogs);
});

app.delete('/api/afk/logs/:id', (req, res) => {
    const logId = parseFloat(req.params.id);
    afkLogs = afkLogs.filter(log => log.id !== logId);
    saveAfkLogs();
    res.json({ success: true });
});

app.delete('/api/afk/logs', (req, res) => {
    afkLogs = [];
    saveAfkLogs();
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    let avatarURL = null;
    if (client && client.user) {
        const avatarHash = client.user.avatar;
        const userId = client.user.id;
        if (avatarHash) {
            const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
            avatarURL = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=128`;
        } else {
            const discriminator = client.user.discriminator;
            avatarURL = `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`;
        }
    }
    
    res.json({
        connected: client && client.user ? true : false,
        username: client && client.user ? client.user.tag : 'Not connected',
        displayName: client && client.user ? (client.user.globalName || client.user.username) : 'Not connected',
        avatar: avatarURL,
        currentStatus: currentConfig.status || 'online',
        deviceType: currentConfig.deviceType || 'desktop',
        twitchUrl: TWITCH_URL
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web dashboard running on port ${PORT}`);
    console.log(`🔗 Access at: http://localhost:${PORT}`);
    console.log(`🔐 Login: ${AUTH_USERNAME} / ${AUTH_PASSWORD}`);
    console.log(`📱 Device mode: ${isMobileOnline ? 'Mobile' : 'Desktop'}`);
    if (TWITCH_URL !== 'https://www.twitch.tv/discordapp') {
        console.log(`🎥 Twitch URL: ${TWITCH_URL}`);
    }
});

initializeClient();

client.login(TOKEN).catch(err => {
    console.error('❌ Failed to login:', err.message);
    process.exit(1);
});