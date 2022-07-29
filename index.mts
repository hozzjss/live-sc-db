import { Client, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { SqliteMirrorRepository } from "./db.mjs";
import { join as pathJoin } from "path";
import Database from "better-sqlite3";
import { JSONFile, Low } from "lowdb";
import schedule from "node-schedule";
import {
  IAddMemberUpdate,
  IAddMessageUpdate,
  IAddReactionUpdate,
  IDeleteMemberUpdate,
  IDeleteMessageUpdate,
  IDeleteReactionUpdate,
  IUpdate,
  UpdateType
} from "./types.mjs";
import {
  GatewayDispatchEvents,
  GatewayGuildMemberAddDispatchData,
  GatewayGuildMemberRemoveDispatchData,
  GatewayMessageCreateDispatchData,
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData
} from "discord-api-types/v10";


const file = pathJoin("cache", "db.json");
const adapter = new JSONFile<{ updates: IUpdate[] }>(file);
const db = new Low(adapter);
await db.read();
db.data ||= { updates: [] };

await db.write();

config();
const [, stacks] = process.env.GUILDS.split(",");
const channels = process.env.CHANNELS.split(",");

const stacks_path = pathJoin("cache", `discordMirror-${stacks}.db`);
const stacks_db = new Database(stacks_path);

const stacks_repo = new SqliteMirrorRepository(stacks_db, stacks);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers
  ]
});


client.ws.on(GatewayDispatchEvents.MessageReactionAdd, (reaction: GatewayMessageReactionAddDispatchData) => {
  if (channels.some(channel => channel === reaction.channel_id)) {
    const update: IAddReactionUpdate = {
      type: UpdateType.ADD_REACTION,
      payload: {
        emoji: reaction.emoji,
        authorId: reaction.user_id,
        channelId: reaction.channel_id,
        messageId: reaction.message_id
      }
    };
    db.data.updates.push(update);

    db.write();
  }
});

client.ws.on(GatewayDispatchEvents.MessageReactionRemove, (reaction: GatewayMessageReactionRemoveDispatchData) => {
  if (channels.some(channel => channel === reaction.channel_id)) {
    const update: IDeleteReactionUpdate = {
      type: UpdateType.DELETE_REACTION,
      payload: {
        message_id: reaction.message_id,
        author_id: reaction.user_id,
        emoji: reaction.emoji
      }
    };
    db.data.updates.push(update);

    db.write();
  }
});

client.ws.on(GatewayDispatchEvents.MessageCreate, (message: GatewayMessageCreateDispatchData) => {
  if (channels.some(channel => channel === message.channel_id)) {
    const update: IAddMessageUpdate = {
      type: UpdateType.ADD_MESSAGE,
      payload: {
        id: message.id,
        authorId: message.author.id,
        content: message.content,
        channelId: message.channel_id,
        mentions: message.mentions.map((user) => ({
          userId: user.id,
          count: message.content.search(`<@!?${user.id}>`)
        })),
        nonUserAuthor: message.webhook_id != null || false,
        reactionEmoji: [],
        timestampMs: Date.parse(message.timestamp)
      }
    };
    db.data.updates.push(update);

    db.write();
  }
});

client.ws.on(GatewayDispatchEvents.MessageDelete, (message: GatewayMessageCreateDispatchData) => {
  if (channels.some(channel => channel === message.channel_id)) {
    const update: IDeleteMessageUpdate = {
      type: UpdateType.DELETE_MESSAGE,
      payload: {
        message_id: message.id
      }
    };
    db.data.updates.push(update);

    db.write();
  }
});

client.ws.on(GatewayDispatchEvents.GuildMemberAdd, (member: GatewayGuildMemberAddDispatchData) => {
  if (member.guild_id === stacks) {
    const update: IAddMemberUpdate = {
      type: UpdateType.ADD_MEMBER,
      payload: {
        user: {
          id: member.user.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          bot: member.user.bot
        },
        nick: member.nick,
        roles: member.roles
      }
    };
    db.data.updates.push(update);

    db.write();
  }
});

client.ws.on(GatewayDispatchEvents.GuildMemberRemove, (member: GatewayGuildMemberRemoveDispatchData) => {
  if (member.guild_id === stacks) {
    const update: IDeleteMemberUpdate = {
      type: UpdateType.DELETE_MEMBER,
      payload: member.user.id
    };
    db.data.updates.push(update);
    db.write();
  }
});

const handleAddReaction = (data: IAddReactionUpdate) => {
  stacks_repo.addReaction(data.payload);
};

const handleDeleteReaction = (data: IDeleteReactionUpdate) => {
  stacks_repo.deleteReaction(data.payload.message_id, data.payload.author_id, data.payload.emoji);
};

const handleAddMessage = (data: IAddMessageUpdate) => {
  stacks_repo.addMessage(data.payload);
};

const handleDeleteMessage = (data: IDeleteMessageUpdate) => {
  stacks_repo.deleteMessage(data.payload.message_id);
};

const handleAddMember = (data: IAddMemberUpdate) => {
  stacks_repo.addMember(data.payload);
};

const handleDeleteMember = (data: IDeleteMemberUpdate) => {
  stacks_repo.deleteMember(data.payload);
};

const updateFns: { [x: number]: (data: IUpdate) => any } = {
  [UpdateType.ADD_REACTION]: handleAddReaction,
  [UpdateType.DELETE_REACTION]: handleDeleteReaction,
  [UpdateType.ADD_MESSAGE]: handleAddMessage,
  [UpdateType.DELETE_MESSAGE]: handleDeleteMessage,
  [UpdateType.ADD_MEMBER]: handleAddMember,
  [UpdateType.DELETE_MEMBER]: handleDeleteMember
};

schedule.scheduleJob("0 * * * *", async () => {
  await db.read();
  const updates = db.data.updates;
  if (updates.length) {
    console.info("Updating db...");
    let index = 0;
    for (const update of updates) {
      try {
        updateFns[update.type](update);
        db.data.updates = db.data.updates.slice(1);
        index++;
        console.info("Update", update, "completed!");
      } catch (e) {
        console.log("failed to apply update", update, "because", e);
      }
    }

    await db.write();
  } else {
    console.log("No updates");
  }
});

client.login(process.env.SOURCECRED_DISCORD_TOKEN);


