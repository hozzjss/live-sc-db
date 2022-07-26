import {Client, GatewayIntentBits} from 'discord.js'
import {config} from "dotenv";

config()

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent]
})

client.on('ready', () => {
    const channels = client.guilds.fetch()
})


client.login(process.env.SOURCECRED_DISCORD_TOKEN)


