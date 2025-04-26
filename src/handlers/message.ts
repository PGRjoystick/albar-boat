import { Message, MessageTypes } from "whatsapp-web.js";
import { startsWithIgnoreCase, broadcastMessage, checkAndUpdateProStatus, normalizeWhiteSpaces } from "../utils";
import { client } from "../index";
import { getPhoneNumbersByLocation, getPhoneNumbersByLocationPrefix, getAllPhoneNumbers, addUser, deleteUser, getUserIdByPhoneNumber, getUserAndPhoneNumbers, deletePhoneNumber, addPhoneNumber, initializeUserParam } from "../api/sqlite3";

// CLI
import * as cli from "../cli/ui";

// For deciding to ignore old messages
import { botReadyTimestamp } from "../index";

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const whitelistedPhoneNumbers = process.env.WHITELISTED_PHONE_NUMBERS?.split(',');

// Function to check if a phone number is whitelisted
function isWhitelisted(phoneNumber: string): boolean {
    return whitelistedPhoneNumbers?.includes(phoneNumber) ?? false;
}

// Handles message
async function handleIncomingMessage(message: Message) {
	
	const messageString = normalizeWhiteSpaces(message.body);
	// Prevent handling old messages
	if (message.timestamp != null) {
		const messageTimestamp = new Date(message.timestamp * 1000);

		// If startTimestamp is null, the bot is not ready yet
		if (botReadyTimestamp == null) {
			cli.print("Mengabaikan pesan karena ayana belum siap: " + messageString);
			return;
		}

		// Ignore messages that are sent before the bot is started
		if (messageTimestamp < botReadyTimestamp) {
			cli.print("Mengabaikan pesan lama: " + messageString);
			return;
		}
	}

	// Do something here...

	cli.print(`[Message] Pesan masuk dari ${message.from}: ${messageString}`);
} 
export { handleIncomingMessage };
