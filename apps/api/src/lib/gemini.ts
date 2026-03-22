import { GoogleGenerativeAI } from '@google/generative-ai';
import { appConfig } from '@pawroute/config';

const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!);

// Allow model override via env var so it can be changed without a full rebuild
const CHAT_MODEL = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash';
const INSIGHTS_MODEL = process.env['GEMINI_INSIGHTS_MODEL'] ?? 'gemini-2.0-flash';

const chatModel = genAI.getGenerativeModel({
  model: CHAT_MODEL,
  generationConfig: {
    maxOutputTokens: appConfig.ai.chatbot.maxTokens,
    temperature: appConfig.ai.chatbot.temperature,
  },
  systemInstruction: appConfig.ai.chatbot.systemPrompt,
});

const insightsModel = genAI.getGenerativeModel({
  model: INSIGHTS_MODEL,
});

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Send a message to the Gemini chatbot with conversation history.
 */
export async function chatWithGemini(
  message: string,
  history: ChatMessage[] = [],
  faqContext?: string
): Promise<string> {
  const chat = chatModel.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  });

  const prompt = faqContext
    ? `Relevant FAQ information:\n${faqContext}\n\nUser question: ${message}`
    : message;

  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

/**
 * Generate a personalized booking confirmation message.
 */
export async function generateBookingConfirmation(params: {
  petName: string;
  serviceName: string;
  date: string;
  time: string;
  groomingNotes?: string;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: appConfig.ai.chatbot.model });
  const prompt = `Write a warm, friendly, 2-sentence booking confirmation email body for:
- Pet: ${params.petName}
- Service: ${params.serviceName}
- Date: ${params.date} at ${params.time}
${params.groomingNotes ? `- Special notes: ${params.groomingNotes}` : ''}
Keep it under 60 words. Be enthusiastic about the pet. Sign off as "${appConfig.product.name} Team".`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate weekly business insights summary.
 */
export async function generateWeeklyInsights(stats: {
  totalBookings: number;
  totalRevenue: number;
  topService: string;
  busiestDay: string;
  newCustomers: number;
  cancellationRate: number;
}): Promise<string> {
  const prompt = `You are a business analyst for ${appConfig.product.name}, a pet grooming platform.
Write a concise 3-bullet weekly business summary based on these stats:
- Total bookings: ${stats.totalBookings}
- Total revenue: ${appConfig.locale.currencySymbol} ${stats.totalRevenue}
- Top service: ${stats.topService}
- Busiest day: ${stats.busiestDay}
- New customers: ${stats.newCustomers}
- Cancellation rate: ${stats.cancellationRate}%

Format: 3 bullet points. Each 1 sentence. End with 1 actionable suggestion.`;

  const result = await insightsModel.generateContent(prompt);
  return result.response.text();
}
