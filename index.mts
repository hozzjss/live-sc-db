import { Client, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { SqliteMirrorRepository } from "./db.mjs";
import { join as pathJoin } from "path";
import Database from "better-sqlite3";
import { Low, JSONFile } from "lowdb";
import {
  IAddMessageUpdate,
  IAddReactionUpdate,
  IDeleteMessageUpdate,
  IDeleteReactionUpdate,
  IUpdate, UpdateType
} from "./types.mjs";
import {
  GatewayDispatchEvents, GatewayMessageCreateDispatchData,
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

const updateFns: { [x: number]: (data: IAddReactionUpdate | IAddMessageUpdate | IDeleteMessageUpdate | IDeleteReactionUpdate) => any } = {
  [UpdateType.ADD_REACTION]: handleAddReaction,
  [UpdateType.DELETE_REACTION]: handleDeleteReaction,
  [UpdateType.ADD_MESSAGE]: handleAddMessage,
  [UpdateType.DELETE_MESSAGE]: handleDeleteMessage
};


client.login(process.env.SOURCECRED_DISCORD_TOKEN);


