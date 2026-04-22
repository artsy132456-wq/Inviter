const { Client } = require('discord.js-selfbot-v13');
const CHANNEL_IDS = [
  '1070392772776968212',
  '1069641715385892965',
  '1069641657462562836',
  '1078394149058920529',
  '1078394026190962719',
  '1079276847365357599',
  '1079276828189020230'
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
const MESSAGE2 = `Dm me to join a small lifesteal server (cracked launchers enabled)`;
const recentlySent1 = {};
const recentlySent2 = {};
const sentMessages1 = {};
const sentMessages2 = {};

function startBot(token, message, delayMs, tracker, sentMessages) {
  const client = new Client();

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    setInterval(async () => {
      for (const channelId of CHANNEL_IDS) {
        try {
          const channel = await client.channels.fetch(channelId);
          const fetchedMessages = await channel.messages.fetch({ limit: 1 });
          const latestMsg = fetchedMessages.first();

          if (latestMsg && latestMsg.author.id !== client.user.id && !IGNORED_USER_IDS.includes(latestMsg.author.id)) {
            await channel.send(message);
            console.log(`Resent in ${channelId} because ${latestMsg.author.tag} had latest message`);
          }
        } catch (err) {
          console.error(`Failed to check ${channelId}:`, err.message);
        }
      }
    }, 3000);
  });

  client.on('messageCreate', async (msg) => {
    if (msg.author.id === client.user.id) return;
    if (!CHANNEL_IDS.includes(msg.channelId)) return;
    if (IGNORED_USER_IDS.includes(msg.author.id)) return;
    const key = `${msg.channelId}-${msg.id}`;
    if (tracker[key]) return;
    tracker[key] = true;
    setTimeout(() => delete tracker[key], 10000);
    setTimeout(async () => {
      try {
        const sent = await msg.channel.send(message);
        sentMessages[msg.id] = sent;
        console.log(`Sent message after ${msg.author.tag} posted`);
      } catch (err) {
        console.error('Failed to send:', err.message);
      }
    }, delayMs);
  });

  client.on('messageDelete', async (msg) => {
    if (sentMessages[msg.id]) {
      try {
        await sentMessages[msg.id].delete();
        delete sentMessages[msg.id];
        console.log('Deleted our message because trigger was deleted');
      } catch (err) {
        console.error('Failed to delete:', err.message);
      }
    }
  });

  client.login(token);
}

startBot(process.env.TOKEN1, MESSAGE2, 0, recentlySent1, sentMessages1);