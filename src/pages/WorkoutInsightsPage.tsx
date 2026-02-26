import { useState, useEffect, useRef } from 'react';
import { startInsightsSession, TimeframeOption } from '../api';
import FormContainer from '../components/common/FormContainer';
import styles from './WorkoutInsightsPage.module.css';

interface Message {
  sender: 'ai' | 'user';
  text: string;
}

function WorkoutInsightsPage() {
  const [question, setQuestion] = useState<string>('');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [messages, setMessages] = useState<Message[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSummary, setDataSummary] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

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

      // Connect to SSE stream
      const eventSource = new EventSource(`/api/workout-insights/stream/${response.sessionId}`, {
        withCredentials: true,
      });
      eventSourceRef.current = eventSource;

      let currentResponse = '';

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              console.log('SSE connected');
              break;

            case 'thinking':
              // Show thinking indicator
              break;

            case 'content':
              // Append chunk to current response
              currentResponse += data.chunk;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { sender: 'ai', text: currentResponse },
              ]);
              break;

            case 'complete':
              setLoading(false);
              if (eventSource) {
                eventSource.close();
              }
              break;

            case 'error':
              setError(data.message || 'An error occurred');
              setLoading(false);
              if (eventSource) {
                eventSource.close();
              }
              break;

            case 'ping':
              // Keep-alive ping, ignore
              break;

            default:
              console.log('Unknown SSE event type:', data.type);
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setError('Connection error. Please try again.');
        setLoading(false);
        eventSource.close();
      };
    } catch (err) {
      console.error('Failed to start insights session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
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
