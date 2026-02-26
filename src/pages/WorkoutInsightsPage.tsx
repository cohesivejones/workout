import { useState, useCallback } from 'react';
import { startInsightsSession, TimeframeOption } from '../api';
import FormContainer from '../components/common/FormContainer';
import { useSSE, SSEMessage } from '../hooks/useSSE';
import styles from './WorkoutInsightsPage.module.css';

interface Message {
  sender: 'ai' | 'user';
  text: string;
}

// SSE message types for this page
interface InsightsSSEMessage extends SSEMessage {
  type: 'connected' | 'thinking' | 'content' | 'complete' | 'error' | 'ping';
  chunk?: string;
  message?: string;
}

function WorkoutInsightsPage() {
  const [question, setQuestion] = useState<string>('');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSummary, setDataSummary] = useState<string>('');

  // Handle SSE messages
  const handleSSEMessage = useCallback((data: InsightsSSEMessage) => {
    switch (data.type) {
      case 'connected':
        console.log('SSE connected');
        break;

      case 'thinking':
        // Thinking indicator already shown
        break;

      case 'content':
        // Append chunk to current response
        if (data.chunk) {
          setMessages((msgs) => {
            const lastMessage = msgs[msgs.length - 1];
            const updatedText = (lastMessage?.text || '') + data.chunk;
            return [...msgs.slice(0, -1), { sender: 'ai', text: updatedText }];
          });
        }
        break;

      case 'complete':
        setLoading(false);
        break;

      case 'error':
        setError(data.message || 'An error occurred');
        setLoading(false);
        break;

      case 'ping':
        // Keep-alive ping, ignore
        break;

      default:
        console.log('Unknown SSE event type:', data.type);
    }
  }, []);

  // Handle SSE errors
  const handleSSEError = useCallback((err: Error) => {
    console.error('SSE error:', err);
    setError('Connection error. Please try again.');
    setLoading(false);
  }, []);

  // Use SSE hook
  const { close: closeSSE } = useSSE<InsightsSSEMessage>({
    url: sessionId ? `/api/workout-insights/stream/${sessionId}` : null,
    onMessage: handleSSEMessage,
    onError: handleSSEError,
  });

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setMessages([]);
    setDataSummary('');

    try {
      // Add user question to messages
      setMessages([{ sender: 'user', text: question }]);

      const response = await startInsightsSession(question, timeframe);
      setSessionId(response.sessionId);

      // Set data summary
      const { workouts, exercises, dateRange } = response.dataCount;
      setDataSummary(
        `Using ${workouts} workout${workouts !== 1 ? 's' : ''} with ${exercises} exercise${
          exercises !== 1 ? 's' : ''
        } from ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(
          dateRange.end
        ).toLocaleDateString()}`
      );

      // Add thinking message
      setMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
    } catch (err) {
      console.error('Failed to start insights session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    closeSSE();
    setQuestion('');
    setMessages([]);
    setSessionId(null);
    setError(null);
    setDataSummary('');
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <FormContainer title="Workout Insights" errorMessage={error} asForm={false}>
        <div className={styles.description}>
          <p>
            Ask questions about your workout history and get AI-powered insights based on your
            training data. The AI will analyze your recent workouts to provide helpful answers.
          </p>
        </div>

        {messages.length === 0 ? (
          <div className={styles.inputSection}>
            <label htmlFor="timeframe" className={styles.label}>
              Data timeframe:
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
              className={styles.timeframeSelect}
              disabled={loading}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
            </select>

            <label htmlFor="question" className={styles.label}>
              Your question:
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What exercises am I improving at? How often do I work my legs? What's my average bench press weight?"
              className={styles.questionInput}
              rows={4}
              disabled={loading}
            />

            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className={`${styles.askButton} ${loading ? styles.loading : ''}`}
            >
              {loading ? 'Analyzing...' : 'Ask AI'}
            </button>
          </div>
        ) : (
          <>
            {dataSummary && <div className={styles.dataSummary}>{dataSummary}</div>}

            <div className={styles.conversationContainer}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${
                    message.sender === 'ai' ? styles.aiMessage : styles.userMessage
                  }`}
                >
                  <div className={styles.messageSender}>
                    {message.sender === 'ai' ? '🤖 AI Assistant' : '👤 You'}
                  </div>
                  <div className={styles.messageText}>
                    {message.text || (
                      <div className={styles.loadingDots}>
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.resetSection}>
              <button onClick={handleReset} className={styles.resetButton} disabled={loading}>
                Ask Another Question
              </button>
            </div>
          </>
        )}
      </FormContainer>
    </div>
  );
}

export default WorkoutInsightsPage;
