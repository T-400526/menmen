const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const { exec } = require('child_process');
const session = require('express-session');
const { Client, GatewayIntentBits } = require('discord.js');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const logFilePath = path.join('C:', 'Users', 'chtun', 'OneDrive', 'デスクトップ', 'bot2', 'log.txt');
const terminalHtmlPath = path.join('C:', 'Users', 'chtun', 'OneDrive', 'デスクトップ', 'bot2', 'web', 'terminal.html');
const terminalHtmlPath2 = path.join('C:', 'Users', 'chtun', 'OneDrive', 'デスクトップ', 'bot2', 'web', 'home.html');
const terminalHtmlPath3 = path.join('C:', 'Users', 'chtun', 'OneDrive', 'デスクトップ', 'bot2', 'web', 'chat.html');


const BOT_TOKEN = '';
const API_ENDPOINT = 'https://discord.com/api/v10';
const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = '';
const OAUTH2_AUTH_URL = '';
const BASE_PATH = path.join('C:', 'Users', 'chtun', 'OneDrive', 'デスクトップ', 'bot2', 'call');
const DATA_PATH = path.join(BASE_PATH, 'data.txt');
const SERVER_DATA_PATH = path.join(BASE_PATH, 'serverdata.txt');
const TEST2_HTML_PATH = path.join(BASE_PATH, 'test2.html');
const TEST3_HTML_PATH = path.join(BASE_PATH, 'test3.html');
const TEST4_HTML_PATH = path.join(BASE_PATH, 'test4.html');
const TEST5_HTML_PATH = path.join(BASE_PATH, 'test5.html');

const botClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

botClient.once('ready', () => {
    botData.status = 'Online';
    botData.serverCount = botClient.guilds.cache.size;
    botData.userCount = botClient.users.cache.size;
    botData.botName = botClient.user.username;
    botData.botIcon = botClient.user.displayAvatarURL();
    console.log(`${botData.botName} is online!`);
});

botClient.login(BOT_TOKEN);

async function assignRoleToUser(guildId, roleId, userId) {
    try {
        const guild = await botClient.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.add(role);
            console.log(`Assigned role ${role.name} to ${member.user.tag}`);
        } else {
            throw new Error('Role not found');
        }
    } catch (error) {
        console.error('Error while assigning role:', error.message);
        throw error; 
    }
}

async function getAccessToken(code) {
    try {
        const response = await axios.post(
            `${API_ENDPOINT}/oauth2/token`,
            querystring.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                scope: 'guilds.join identify'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Error while getting access token:', error.response ? error.response.data : error.message);
        throw new Error('アクセストークンの取得中にエラーが発生しました。');
    }
}

async function getUserId(accessToken) {
    try {
        const response = await axios.get(`${API_ENDPOINT}/users/@me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.id;
    } catch (error) {
        console.error('Error while getting user ID:', error.response ? error.response.data : error.message);
        throw new Error('ユーザーIDの取得中にエラーが発生しました。');
    }
}

function isTokenAlreadySaved(userId) {
    try {
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return data.split('\n').some(line => line.startsWith(userId));
    } catch (error) {
        console.error('Error while reading token file:', error.message);
        throw new Error('トークンファイルの読み込み中にエラーが発生しました。');
    }
}

function saveTokenToFile(userId, token) {
    try {
        fs.appendFileSync(DATA_PATH, `${userId}:${token}\n`);
    } catch (error) {
        console.error('Error while saving token to file:', error.message);
        throw new Error('トークンをファイルに保存中にエラーが発生しました。');
    }
}

function saveServerData(guildId, roleId) {
    try {
        fs.writeFileSync(SERVER_DATA_PATH, `${guildId}\n${roleId}`);
    } catch (error) {
        console.error('Error while saving server data:', error.message);
        throw new Error('サーバーデータの保存中にエラーが発生しました。');
    }
}

function clearServerData() {
    try {
        fs.writeFileSync(SERVER_DATA_PATH, '');
    } catch (error) {
        console.error('Error while clearing server data:', error.message);
        throw new Error('サーバーデータのクリア中にエラーが発生しました。');
    }
}

app.get('/', (req, res) => {
    const guildId = req.query.guild_id;
    const roleId = req.query.role_id;

    if (!guildId || !roleId) {
        return res.status(400).send('Error: 認証パネルが正しく動作されていません');
    }

    if (fs.existsSync(SERVER_DATA_PATH)) {
        const serverData = fs.readFileSync(SERVER_DATA_PATH, 'utf8').trim();
        if (serverData.length > 0) {
            clearServerData();
        }
    }

    saveServerData(guildId, roleId);
    fs.readFile(TEST4_HTML_PATH, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading test4.html:', err.message);
            return res.status(500).send('内部サーバーエラー');
        }

        res.send(`
            ${data}
            <script>
                setTimeout(function() {
                    window.location.href = '${OAUTH2_AUTH_URL}';
                }, 2000);
            </script>
        `);
    });
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        clearServerData();
        return res.status(400).send('エラー: コードが提供されていません。');
    }

    try {
        const token = await getAccessToken(code);
        const userId = await getUserId(token);

        if (!isTokenAlreadySaved(userId)) {
            saveTokenToFile(userId, token);
        }

        const serverData = fs.readFileSync(SERVER_DATA_PATH, 'utf8').split('\n');
        const guildId = serverData[0];
        const roleId = serverData[1];

        try {
            await assignRoleToUser(guildId, roleId, userId);
            clearServerData();
            fs.readFile(TEST2_HTML_PATH, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading test2.html:', err.message);
                    return res.status(500).send('内部サーバーエラー');
                }
                res.send(data);
            });
        } catch (assignRoleError) {
            fs.readFile(TEST5_HTML_PATH, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading test5.html:', err.message);
                    return res.status(500).send('内部サーバーエラー');
                }
                res.status(500).send(data); 
            });
        }
    } catch (error) {
        fs.readFile(TEST3_HTML_PATH, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading test3.html:', err.message);
                return res.status(500).send('内部サーバーエラー');
            }
            res.status(400).send(data);
        });
    } finally {
        clearServerData();
    }
});






let botData = {
    status: 'Offline',
    serverCount: 0,
    userCount: 0,
    botName: '',
    botIcon: ''
};

fs.writeFile(logFilePath, '', (err) => {
    if (err) {
        console.error('Error clearing log file:', err);
    } else {
        console.log('log.txt has been cleared.');
    }
});

app.get('/events', (req, res) => {
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading log file');
        }
        res.send(data);
    });
});

app.get('/terminal', (req, res) => {
    fs.readFile(terminalHtmlPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error loading HTML file');
        }
        res.send(data);
    });
});

app.get('/home', (req, res) => {
    fs.readFile(terminalHtmlPath2, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error loading HTML file');
        }
        res.send(data);
    });
});








app.get('/bot-status', (req, res) => {
    res.json(botData);
});


const PORT = process.env.PORT || 50688;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
