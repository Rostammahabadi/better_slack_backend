import { RequestHandler } from "express";
import MessageService from "../services/MessageService";
import { IMessage } from "../models/Message";
export class MessageController {
    static createMessage: RequestHandler = async (req, res, next): Promise<void> => {
        const { channelId } = req.params;
        const message = await MessageService.createMessage(channelId, req.body);
        res.json(message);
    }
}