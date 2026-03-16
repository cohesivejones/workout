import { useState, useCallback } from 'react';
import { startCoachSession, respondToCoachWorkout } from '../api';
import FormContainer from '../components/common/FormContainer';
import { useSSE, SSEMessage } from '../hooks/useSSE';
import { formatWeightWithKg } from '../utils/weight';
import styles from './WorkoutCoachPage.module.css';

interface WorkoutPlan {
  date: string;
  exercises: {
    name: string;
    reps: number;
    weight?: number;
  }[];
}

interface Message {
  sender: 'coach' | 'user';
  text: string;
}

// SSE message types for this page
interface CoachSSEMessage extends SSEMessage {
  type: 'connected' | 'generating' | 'workout' | 'saved' | 'error' | 'ping';
  plan?: WorkoutPlan;
  message?: string;
}

const DEFAULT_PROMPT =
  'Generate me a balanced full-body workout with 6 exercises covering legs, core, and upper body';

function WorkoutCoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationEnded, setConversationEnded] = useState<boolean>(false);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutPlan | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_PROMPT);

  // Handle SSE messages
  const handleSSEMessage = useCallback((data: CoachSSEMessage) => {
    switch (data.type) {
      case 'connected':
        console.log('SSE connected');
        break;

      case 'generating':
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { sender: 'coach', text: 'Generating your workout...' },
        ]);
        break;

      case 'workout': {
        // Format workout for display
        if (!data.plan) return;
        const plan = data.plan;
        const workoutText = formatWorkoutForDisplay(plan);
        setMessages((prev) => {
          // Remove "Generating..." and previous "Ready to do this workout?" messages
          const filteredMessages = prev.filter(
            (msg) =>
              !msg.text.includes('Generating your workout') &&
              msg.text !== 'Ready to do this workout?'
          );
          return [
            ...filteredMessages,
            { sender: 'coach', text: workoutText },
            { sender: 'coach', text: 'Ready to do this workout?' },
          ];
        });
        setCurrentWorkout(plan);
        setLoading(false);
        break;
      }

      case 'saved':
        setMessages((prev) => [
          ...prev,
          {
            sender: 'coach',
            text: "Great! Your workout has been saved. Let's crush it! 💪",
          },
        ]);
        setConversationEnded(true);
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
  const { close: closeSSE } = useSSE<CoachSSEMessage>({
    url: sessionId ? `/api/workout-coach/stream/${sessionId}` : null,
    onMessage: handleSSEMessage,
    onError: handleSSEError,
  });

  const formatWorkoutForDisplay = (plan: WorkoutPlan): string => {
    const lines = ["Here's your workout for today:", ''];

    plan.exercises.forEach((exercise, index) => {
      let line = `${index + 1}. ${exercise.name} - ${exercise.reps} reps`;
      if (exercise.weight) {
        line += ` @ ${formatWeightWithKg(exercise.weight)}`;
      }
      lines.push(line);
    });

    return lines.join('\n');
  };

  const handleStartSession = async () => {
    // Validate prompt
    if (!customPrompt.trim()) {
      setError('Please enter a workout request');
      return;
    }

    setLoading(true);
    setError(null);
    setMessages([]);
    setConversationEnded(false);
    setCurrentWorkout(null);

    try {
      const response = await startCoachSession(customPrompt.trim());
      setSessionId(response.sessionId);

      // Add initial message
      setMessages([{ sender: 'coach', text: 'Generating your workout...' }]);
    } catch (err) {
      console.error('Failed to start coach session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session. Please try again.');
      setLoading(false);
    }
  };

  const handleRespond = async (response: 'yes' | 'no') => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      // Add user's response to messages
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: response === 'yes' ? 'Yes!' : 'No, generate another' },
      ]);

      await respondToCoachWorkout(sessionId, response);

      // Don't manually clean up state here - let SSE events handle it
      // The backend will send a 'generating' event followed by a 'workout' event
    } catch (err) {
      console.error('Failed to respond to coach:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    closeSSE();
    setMessages([]);
    setSessionId(null);
    setError(null);
    setConversationEnded(false);
    setCurrentWorkout(null);
    setLoading(false);
    setCustomPrompt(DEFAULT_PROMPT);
  };

  const isWaitingForResponse =
    sessionId && !conversationEnded && currentWorkout && !loading && messages.length > 0;

  return (
    <div className={styles.container}>
      <FormContainer title="Workout Coach" errorMessage={error} asForm={false}>
        <div className={styles.description}>
          <p>
            Your personal AI workout coach will generate a customized workout based on your recent
            training history. Start a conversation to get your workout for today!
          </p>
        </div>

        {messages.length === 0 ? (
          <div className={styles.startSection}>
            <div className={styles.promptSection}>
              <label htmlFor="customPrompt" className={styles.promptLabel}>
                What kind of workout would you like?
              </label>
              <textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className={styles.promptTextarea}
                rows={3}
                placeholder="Describe your ideal workout..."
                disabled={loading}
              />
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading || !customPrompt.trim()}
              className={`${styles.startButton} ${loading ? styles.loading : ''}`}
            >
              {loading ? 'Starting...' : 'Ask Coach'}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.conversationContainer}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${
                    message.sender === 'coach' ? styles.coachMessage : styles.userMessage
                  }`}
                >
                  <div className={styles.messageSender}>
                    {message.sender === 'coach' ? '🤖 Coach' : '👤 You'}
                  </div>
                  <div className={styles.messageText}>{message.text}</div>
                </div>
              ))}
              {loading && (
                <div className={`${styles.message} ${styles.coachMessage}`}>
                  <div className={styles.messageSender}>🤖 Coach</div>
                  <div className={styles.messageText}>
                    <div className={styles.loadingDots}>
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isWaitingForResponse && (
              <div className={styles.responseButtons}>
                <button
                  onClick={() => handleRespond('yes')}
                  disabled={loading}
                  className={`${styles.responseButton} ${styles.yesButton}`}
                >
                  Yes, let&apos;s do it!
                </button>
                <button
                  onClick={() => handleRespond('no')}
                  disabled={loading}
                  className={`${styles.responseButton} ${styles.noButton}`}
                >
                  No, generate another
                </button>
              </div>
            )}

            {conversationEnded && (
              <div className={styles.restartSection}>
                <button onClick={handleReset} className={styles.restartButton}>
                  Start New Conversation
                </button>
              </div>
            )}
          </>
        )}
      </FormContainer>
    </div>
  );
}

export default WorkoutCoachPage;
