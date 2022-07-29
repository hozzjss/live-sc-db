import * as Model from "./db-types.mjs";

export enum UpdateType {
  ADD_REACTION,
  ADD_MESSAGE,
  DELETE_MESSAGE,
  DELETE_REACTION
}

export interface IAddReactionUpdate {
  type: UpdateType.ADD_REACTION;
  payload: Model.Reaction;
}

export interface IAddMessageUpdate {
  type: UpdateType.ADD_MESSAGE,
  payload: Model.Message,
}

export interface IDeleteMessageUpdate {
  type: UpdateType.DELETE_MESSAGE,
  payload: { message_id: Model.Snowflake },
}

export interface IDeleteReactionUpdate {
  type: UpdateType.DELETE_REACTION,
  payload: {
    message_id: Model.Snowflake,
    author_id: Model.Snowflake,
    emoji: Model.Emoji
  }
}

export type IUpdate = IAddMessageUpdate | IAddReactionUpdate | IDeleteMessageUpdate | IDeleteReactionUpdate