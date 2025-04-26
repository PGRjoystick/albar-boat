import schedule from 'node-schedule';
import dotenv from 'dotenv';
import {client } from '../index';

// Load environment variables
dotenv.config();

/**
 * Configuration for the scheduler
 * These values can be set in the .env file
 */
const config = {
  messageHour: parseInt(process.env.MESSAGE_HOUR || '0', 10), // Default: 0 (12 AM)
  messageMinute: parseInt(process.env.MESSAGE_MINUTE || '0', 10), // Default: 0
  workDays: process.env.WORK_DAYS || '1-5' // Default: Monday to Friday
};

/**
 * Parse the work days configuration string into an array of day numbers
 * @param workDaysConfig Format: "1-5" for Mon-Fri or "1,3,5" for Mon,Wed,Fri
 * @returns Array of day numbers (0-6, where 0 is Sunday)
 */

function parseWorkDays(workDaysConfig: string): number[] {
  const workDays: number[] = [];
  
  if (workDaysConfig.includes('-')) {
    const [start, end] = workDaysConfig.split('-').map(Number);
    for (let i = start; i <= end; i++) {
      workDays.push(i);
    }
  } 
  else if (workDaysConfig.includes(',')) {
    return workDaysConfig.split(',').map(Number);
  }
  else {
    return [parseInt(workDaysConfig, 10)];
  }
  
  return workDays;
}

/**
 * Schedules a message to be sent at the configured time
 * but only on the configured work days
 * @param messageCallback Function to call when it's time to send a message
 * @returns The scheduled job
 */
export function scheduleWorkdayMessage(
  messageCallback: () => Promise<void>
): schedule.Job {
  const { messageHour, messageMinute, workDays } = config;
  const workDayNumbers = parseWorkDays(workDays);
  
  // Create a cron expression for the specified time
  const cronExpression = `${messageMinute} ${messageHour} * * *`;
  
  const job = schedule.scheduleJob(cronExpression, async () => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
      
      // Check if current day is a work day
      const isWorkDay = workDayNumbers.includes(dayOfWeek);
      
      if (isWorkDay) {
        console.log(`Sending scheduled message at ${now.toLocaleString()}`);
        await messageCallback();
      } else {
        console.log(`Skipping scheduled message: Not a work day (day: ${dayOfWeek})`);
      }
    } catch (error) {
      console.error('Error in scheduled job:', error);
    }
  });
  
  // Format the time and work days for display
  const timeStr = `${messageHour.toString().padStart(2, '0')}:${messageMinute.toString().padStart(2, '0')}`;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const workDayNames = workDayNumbers.map(day => daysOfWeek[day]).join(', ');
  
  console.log(`Message scheduler initialized: Will send at ${timeStr} on ${workDayNames}`);
  
  return job;
}

/**
 * Initialize the message scheduler
 * @param messageCallback Function to call when it's time to send a message
 */
export function initializeScheduler(
  messageCallback: () => Promise<void> = async () => {
    try {
      // You can customize your message here
      const targetChat = process.env.GROUP_CHAT_ID || '';
      const message = process.env.SCHEDULED_MESSAGE || 'WAKTUNYA ISTIRAHAT...!!!!';
      
      await client.sendMessage(targetChat, message);
      console.log(`Scheduled message sent to ${targetChat}`);
    } catch (error) {
      console.error('Error sending scheduled message:', error);
    }
  }
): schedule.Job {
  return scheduleWorkdayMessage(messageCallback);
}