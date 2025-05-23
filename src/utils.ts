import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getAllPhoneNumbersFromJson, readParam, saveParam } from './api/sqlite3';
import { client } from "./index";
import * as cli from "./cli/ui";
import axios from 'axios';
import { Message } from 'whatsapp-web.js';

export const startsWithIgnoreCase = (str, prefix) => str.toLowerCase().startsWith(prefix.toLowerCase());

const startsWithCase = (str, prefix) => str.toLowerCase().startsWith(prefix);

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const jobFilePath = path.join(__dirname, '../jobProgress.json');

async function saveJobProgress(jobId: string, processedNumbers: string[], messageBody: string) {
    const jobProgress = { jobId, processedNumbers, messageBody };
    fs.writeFileSync(jobFilePath, JSON.stringify(jobProgress, null, 2));
}

async function loadJobProgress(): Promise<{ jobId: string, processedNumbers: string[], messageBody: string }> {
    if (fs.existsSync(jobFilePath)) {
        const data = fs.readFileSync(jobFilePath, 'utf8');
        if (data) {
            return JSON.parse(data);
        }
    }
    return { jobId: '', processedNumbers: [], messageBody: '' };
}

export async function broadcastMessage(messageBody: string) {
    const { jobId, processedNumbers, messageBody: savedMessageBody } = await loadJobProgress();
    const newJobId = jobId || uuidv4();
    const phoneNumbers = await getAllPhoneNumbersFromJson();

    // Use the saved message body if it exists, otherwise use the provided message body
    const finalMessageBody = savedMessageBody || messageBody;

    // Initialize processedNumbers if it's undefined
    const processedNumbersArray = processedNumbers || [];

    for (const phoneNumber of phoneNumbers) {
        if (!processedNumbersArray.includes(phoneNumber)) {
            try {
                await client.sendMessage(phoneNumber, finalMessageBody);
                cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
                processedNumbersArray.push(phoneNumber);
                await saveJobProgress(newJobId, processedNumbersArray, finalMessageBody);
                await delay(10000);
            } catch (err) {
                console.error(`Failed to send message to ${phoneNumber}:`, err);
                break; // Stop the loop if an error occurs
            }
        }
    }

    cli.print('Pesan telah di kirim ke semua nomor yang terdaftar dengan job id : ' + newJobId);

    // Clear the job progress after completion
    await saveJobProgress('', [], '');
}
async function resumeJobOnStartup() {
    const { jobId, processedNumbers, messageBody } = await loadJobProgress();
    if (jobId) {
        console.log(`Resuming job with ID: ${jobId}`);
        await broadcastMessage(messageBody);
    }
}

export async function activatePackage(userID: string, packageId: string) {
    // Check if the user is a pro user
    const userProStatus = await checkAndUpdateProStatus(userID);
    let expirationDate = new Date();
    if (userProStatus.hasActivePackage) {
        if (userProStatus.activePackageName === packageId) {
            // If already a pro user with the same package, calculate new expiration date based on the existing expiration date
            const currentExpiration = new Date(await readParam(userID, 'proExpires'));
            if (currentExpiration > new Date()) {
                expirationDate = currentExpiration;
            }
            expirationDate.setDate(expirationDate.getDate() + 14);
        } else {
            // If the active package name is different from the packageId, set expiration date to 30 days from now
            expirationDate.setDate(expirationDate.getDate() + 14);
        }
    } else {
        // If not a pro user, set expiration date to 30 days from now
        expirationDate.setDate(expirationDate.getDate() + 14);
    }

    cli.print(`[Package Subscription Manager] Melakukan Aktivasi paket ${packageId} pada nomor ${userID}`);
    await saveParam(userID, 'active_package', packageId);
    await saveParam(userID, 'packageExpires', expirationDate.toISOString());
    return;
}

export async function checkAndUpdateProStatus(userId: string): Promise<{ hasActivePackage: boolean; activePackageName: string; expiryDate: string | null; }> {
    const currentDate = new Date();
    let hasActivePackage = false; // Default to false
    let activePackageName
    let expiryDate: string | null = null; // Default to null
  
    try {
        // Read the pro status and expiration date from the database
        const activePackageStatus = await readParam(userId, 'active_package');
        const packageExpires = await readParam(userId, 'packageExpires');
  
        // Check if pro status has expired
        if (activePackageStatus && new Date(packageExpires) < currentDate) {
            await saveParam(userId, 'active_package', null);
            await saveParam(userId, 'packageExpires', null); // Remove expiration date
        } else if (activePackageStatus) {
            hasActivePackage = true; // User is still a pro user
            activePackageName = activePackageStatus;
            expiryDate = new Date(packageExpires).toLocaleDateString(); // Format expiration date
        }
    } catch (error) {
        console.error(`Error checking and updating pro status for user ${userId}:`, error);
    }
  
    return { hasActivePackage, activePackageName, expiryDate };
}

export function normalizeWhiteSpaces(messageBody: string) {
    if (!messageBody) {
        return '';
    }
    // Normalize whitespace
    const normalizedMessageBody = messageBody.replace(/\s+/g, ' ').trim();
    return normalizedMessageBody;
}

// Function to generate a random string
export function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Function to generate a random number with a specified number of digits
export function generateRandomNumber(length: number): number {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}