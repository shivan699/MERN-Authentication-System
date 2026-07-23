const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ------------------------------------------------------------------
// Mock fallback: keeps the chatbot fully functional in demos even
// without an OpenAI key configured. Picks a relevant canned reply
// based on simple keyword matching.
// ------------------------------------------------------------------
const MOCK_REPLIES = [
  {
    keywords: ['resume', 'cv'],
    reply:
      "I've scanned your resume — it's strong on technical skills but light on quantified impact. Add 2-3 metrics (e.g. \"reduced load time by 40%\") to your top bullet points and you'll stand out more to recruiters.",
  },
  {
    keywords: ['interview', 'mock'],
    reply:
      "Let's do a quick mock round. Tell me the role you're targeting (e.g. Frontend Developer) and I'll ask you 3 common technical + behavioral questions for it.",
  },
  {
    keywords: ['remote', 'job', 'role', 'opportun'],
    reply:
      "Based on your profile, I found 3 strong remote matches this week — a Senior Frontend role at a Series B startup, a Full-Stack position at a fintech company, and a React contractor role. Want details on any of these?",
  },
  {
    keywords: ['track', 'application', 'status'],
    reply:
      'You currently have 4 active applications: 2 awaiting response, 1 in interview stage, and 1 offer pending review. Want me to draft a follow-up email for the ones awaiting response?',
  },
];

const DEFAULT_MOCK_REPLY =
  "I'm here to help with your job search — resume feedback, interview prep, role matching, or tracking applications. What would you like to focus on?";

const getMockReply = (message) => {
  const lower = message.toLowerCase();
  const match = MOCK_REPLIES.find((entry) => entry.keywords.some((kw) => lower.includes(kw)));
  return match ? match.reply : DEFAULT_MOCK_REPLY;
};

// ------------------------------------------------------------------
// Real OpenAI call (used automatically once OPENAI_API_KEY is set).
// ------------------------------------------------------------------
const getOpenAIReply = async (messages) => {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are CareerPulse AI, a friendly, concise career assistant for students job-hunting. Keep replies under 80 words. Help with resumes, interview prep, and job search strategy.',
      },
      ...messages,
    ],
    max_tokens: 200,
  });

  return completion.choices[0].message.content;
};

/**
 * Generates a chat reply. Uses OpenAI if OPENAI_API_KEY is set,
 * otherwise falls back to a keyword-matched mock reply so the feature
 * always works in a demo.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages - full conversation so far
 * @returns {Promise<string>}
 */
const generateChatReply = async (messages) => {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  if (!OPENAI_API_KEY) {
    // Simulate a little thinking time so the UI's typing indicator feels real.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return getMockReply(lastUserMessage);
  }

  try {
    return await getOpenAIReply(messages);
  } catch (error) {
    console.error(`OpenAI request failed, falling back to mock reply: ${error.message}`);
    return getMockReply(lastUserMessage);
  }
};

module.exports = { generateChatReply };