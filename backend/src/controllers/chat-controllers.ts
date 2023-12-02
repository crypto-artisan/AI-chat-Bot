import { Request, Response, NextFunction } from "express";
import User from "../models/user-model.js";
import { configureOpenAI } from "../configs/open-ai-config.js";
import { ChatCompletionRequestMessage, OpenAIApi } from "openai";

export const generateChatCompletion = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { message } = req.body;

		const user = await User.findById(res.locals.jwtData.id);
		if (!user) {
			return res.status(401).json("User not registered / token malfunctioned");
		}

		// grab chats of users

		const chats = user.chats.map(({ role, content }) => ({
			role,
			content,
		})) as ChatCompletionRequestMessage[];
		chats.push({ content: message, role: "user" });

		// save chats inside real user object
		user.chats.push({ content: message, role: "user" });

		// send all chats with new ones to OpenAI API
		const config = configureOpenAI();
		const openai = new OpenAIApi(config);

		// make request to openAi
		// get latest response
		const chatResponse = await openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: chats,
		});

		// push latest response to db
		user.chats.push(chatResponse.data.choices[0].message);
		await user.save();

		return res.status(200).json({ chats: user.chats });
	} catch (error) {
        console.log(error)
		return res.status(500).json({ message: error.message });
	}
};