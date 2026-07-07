const { Client } = require('discord.js-selfbot-v13');
const CHANNEL_IDS = [
  '1070392772776968212',
  '1069641715385892965',
  '1069641657462562836',
  '1078394149058920529',
  '1078394026190962719',
  '1079276847365357599',
  '1079276828189020230',
  '1137728294427570196',
  '1137728344658546729',
  '1137728376224882718',
  '1137728590922928238',
  '1137728671491297401',
  '1054901030644617327',
  '1061825536449593365',
  '1061825928155643908',
  '1061826016345071636',
  '1061826190190587925',
  '1061826335317696552',
  '1061826526913507429',
  '1212860223233196042',
  '1212860047177031680',
  '921279948130496552',
  '921129489809932390',
];
const IGNORED_USER_IDS = [
  '1490085623304814695',
  '1490057616054026301'
];
const MESSAGE1 = `Are you looking for a fun SMP to join. Well the UNBOX smp has a good community that can help you get set up with some gear.
The server is pure vanilla but we are willing to add plugins if the community wants.
Now join this server for lots of fun! We do not have a whitelist so you can join instantly!
The server is crossplay so both java and bedrock can play AND Cracked launchers are also able to join
Dm me to join or join using the invite link in my bio`;
const MESSAGE2 = `Dm me to join a fun lifesteal server that both java and bedrock can play(cracked launchers enabled)`;

const recentlySent1 = {};
const recentlySent2 = {};
const sentMessages1 = new Map();
const sentMessages2 = new Map();

const MAX_SENT_MESSAGES = 300;

const FATAL_CODES = new Set([50013, 50001, 40001, 20001, 20002]);

function isFatalError(err) {
  return FATAL_CODES.has(err.code) ||
    /missing permissions|missing access|banned|unknown channel/i.test(err.message);
}

function startBot(token, message, delayMs, tracker, sentMessages) {
  const client = new Client();
  const channelCache = new Map();
  const deadChannels = new Set();
  const lastSent = new Map(); // track when we last sent per channel

  async function getChannel(channelId) {
    if (!channelCache.has(channelId)) {
      channelCache.set(channelId, await client.channels.fetch(channelId));
    }
    return channelCache.get(channelId);
  }

  // Returns how many ms we need to wait before sending in a channel (0 = can send now)
  function getSlowmodeWait(channel) {
    const slowmode = channel.rateLimitPerUser || 0;
    if (slowmode === 0) return 0;
    const last = lastSent.get(channel.id) || 0;
    const wait = (last + slowmode * 1000) - Date.now();
    return wait > 0 ? wait : 0;
  }

  async function sendWithSlowmode(channel, msg) {
    const wait = getSlowmodeWait(channel);
    if (wait > 0) {
      console.log(`[SLOWMODE] ${channel.id} - waiting ${Math.ceil(wait / 1000)}s`);
      await new Promise(res => setTimeout(res, wait));
    }
    const sent = await channel.send(msg);
    lastSent.set(channel.id, Date.now());
    return sent;
  }

  client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await Promise.all(CHANNEL_IDS.map(id => getChannel(id).catch(() => null)));

    const scheduleInterval = () => {
      const jitter = Math.floor(Math.random() * 600) - 300; // -300 to +300
      setTimeout(async () => {
        await Promise.all(CHANNEL_IDS.map(async (channelId) => {
          if (deadChannels.has(channelId)) return;
          try {
            const channel = await getChannel(channelId);
            const fetchedMessages = await channel.messages.fetch({ limit: 1 });
            const latestMsg = fetchedMessages.first();

            if (latestMsg && latestMsg.author.id !== client.user.id && !IGNORED_USER_IDS.includes(latestMsg.author.id)) {
              await sendWithSlowmode(channel, message);
              console.log(`Resent in ${channelId} because ${latestMsg.author.tag} had latest message`);
            }
          } catch (err) {
            if (isFatalError(err)) {
              deadChannels.add(channelId);
              console.log(`[SKIP] Channel ${channelId} blocked for this session: ${err.message}`);
            } else {
              console.error(`Failed to check ${channelId}:`, err.message);
            }
          }
        }));
        scheduleInterval();
      }, 2000 + jitter);
    };
    scheduleInterval();

    setInterval(() => {
      while (sentMessages.size > MAX_SENT_MESSAGES) {
        sentMessages.delete(sentMessages.keys().next().value);
      }
    }, 60000);
  });

  client.on('messageCreate', async (msg) => {
    if (msg.author.id === client.user.id) return;
    if (!CHANNEL_IDS.includes(msg.channelId)) return;
    if (deadChannels.has(msg.channelId)) return;
    if (IGNORED_USER_IDS.includes(msg.author.id)) return;

    const key = `${msg.channelId}-${msg.id}`;
    if (tracker[key]) return;
    tracker[key] = true;
    setTimeout(() => delete tracker[key], 10000);

    const send = async () => {
      try {
        const channel = await getChannel(msg.channelId);
        const sent = await sendWithSlowmode(channel, message);
        if (sentMessages.size >= MAX_SENT_MESSAGES) {
          sentMessages.delete(sentMessages.keys().next().value);
        }
        sentMessages.set(msg.id, sent);
        console.log(`Sent message after ${msg.author.tag} posted`);
      } catch (err) {
        if (isFatalError(err)) {
          deadChannels.add(msg.channelId);
          console.log(`[SKIP] Channel ${msg.channelId} blocked for this session: ${err.message}`);
        } else {
          console.error('Failed to send:', err.message);
        }
      }
    };

    if (delayMs > 0) setTimeout(send, delayMs);
    else send();
  });

  client.on('messageDelete', async (msg) => {
    if (sentMessages.has(msg.id)) {
      try {
        await sentMessages.get(msg.id).delete();
        sentMessages.delete(msg.id);
        console.log('Deleted our message because trigger was deleted');
      } catch (err) {
        console.error('Failed to delete:', err.message);
      }
    }
  });

  client.login(token);
}

startBot(process.env.TOKEN1, MESSAGE2, 0, recentlySent1, sentMessages1);
if (process.env.TOKEN2 && process.env.TOKEN2.trim()) {
  startBot(process.env.TOKEN2, MESSAGE1, 50, recentlySent2, sentMessages2);
}
