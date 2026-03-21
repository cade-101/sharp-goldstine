import * as ImagePicker from 'expo-image-picker';
import { ANTHROPIC_API_KEY } from './config';

export interface ParsedTransaction {
  merchant: string;
  amount: number;
  date: string | null;
  category: 'auto_payment' | 'bill' | 'expense' | 'income' | 'transfer';
  envelope: string;
  is_recurring: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export async function pickAndParseFinancialImage(): Promise<ParsedTransaction[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const base64 = result.assets[0].base64;
  if (!base64) return null;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `You are a financial parsing assistant for a budget app called Tether.

Analyze this bank statement, transaction history, or receipt screenshot and extract all transactions.

Classify each transaction as one of:
- "auto_payment" — recurring automatic bill (Netflix, insurance, loan payments, subscriptions)
- "bill" — one-time or manual bill payment
- "expense" — regular spending (groceries, gas, dining, etc.)
- "income" — money coming in
- "transfer" — money moved between accounts

Return ONLY a JSON array. No markdown. No explanation:
[
  {
    "merchant": "string",
    "amount": number (positive = money in, negative = money out),
    "date": "YYYY-MM-DD or null if unclear",
    "category": "auto_payment|bill|expense|income|transfer",
    "envelope": "groceries|fuel|vehicle|entertainment|emergency|overflow|spectre|bills",
    "is_recurring": boolean,
    "confidence": "high|medium|low"
  }
]`,
          },
        ],
      }],
    }),
  });

  const data = await response.json();
  const text: string = data.content?.[0]?.text || '[]';
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned) as ParsedTransaction[];
  } catch {
    return [];
  }
}
