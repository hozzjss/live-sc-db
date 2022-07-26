import {Client, GatewayIntentBits} from 'discord.js'
import {config} from "dotenv";

config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
    ]
})

client.on('ready', () => {
    // const channels = client.guilds.fetch()
    console.log(process.env.GUILDS)
})


client.login(process.env.SOURCECRED_DISCORD_TOKEN)


