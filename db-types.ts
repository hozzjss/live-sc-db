// https://discordapp.com/developers/docs/reference#snowflakes
export type Snowflake = string;
export const ZeroSnowflake: Snowflake = "0";
export type Guild = {
    readonly id: Snowflake;
    readonly name: string;
    readonly permissions: number;
};
export type BotToken = string;
// https://discordapp.com/developers/docs/resources/channel#channel-object-channel-types
export type ChannelType =
    | "GUILD_TEXT"
    | "DM"
    | "GUILD_VOICE"
    | "GROUP_DM"
    | "GUILD_CATEGORY"
    | "GUILD_NEWS"
    | "GUILD_STORE"
    | "UNKNOWN";

export function channelTypeFromId(id: number): ChannelType {
    switch (id) {
        case 0:
            return "GUILD_TEXT";

        case 1:
            return "DM";

        case 2:
            return "GUILD_VOICE";

        case 3:
            return "GROUP_DM";

        case 4:
            return "GUILD_CATEGORY";

        case 5:
            return "GUILD_NEWS";

        case 6:
            return "GUILD_STORE";

        default: {
            return "UNKNOWN";
        }
    }
}

export type Channel = {
    readonly id: Snowflake;
    readonly type: ChannelType;
    readonly name: string;
    readonly nsfw?: boolean;
    readonly parentId?: Snowflake;
};
export type Role = {
    readonly id: Snowflake;
    readonly name: string;
};
export type User = {
    readonly id: Snowflake;
    readonly username: string;
    readonly discriminator: string;
    readonly bot: boolean;
};
export type GuildMember = {
    readonly user: User;
    readonly nick: string | null | undefined;
    readonly roles: ReadonlyArray<Snowflake>;
};
export type Emoji = {
    readonly id: Snowflake | null | undefined;
    readonly name: string;
};
export type EmojiRef = string;

export function emojiToRef({id, name}: Emoji): EmojiRef {
    // Built-in emoji, unicode names.
    if (!id) return name;
    // Custom emoji.
    return `${name}:${id}`;
}

export function refToEmoji(ref: EmojiRef): Emoji {
    const [name, id] = ref.split(":");
    if (!id)
        return {
            id: null,
            name,
        };
    return {
        id,
        name,
    };
}

export type Message = {
    readonly id: Snowflake;
    readonly channelId: Snowflake;
    readonly authorId: Snowflake;
    // Could be a message from a webhook, meaning the authorId isn't a user.
    readonly nonUserAuthor: boolean;
    readonly timestampMs: number;
    readonly content: string;
    // Normally includes reaction counters, but we don't care about counters.
    // We could filter based on which types of emoji have been added though.
    readonly reactionEmoji: ReadonlyArray<Emoji>;
    // Snowflake of user IDs.
    readonly mentions: ReadonlyArray<Mention>;
};
export type Mention = {
    readonly userId: Snowflake;
    readonly count: number;
};
export type Reaction = {
    readonly channelId: Snowflake;
    readonly messageId: Snowflake;
    readonly authorId: Snowflake;
    readonly emoji: Emoji;
};