import React, { useState } from 'react';
import { useUserContext } from '../contexts/useUserContext';
import { fetchDiagnosticData, analyzeDiagnosticData } from '../api';
import styles from './DiagnosticianPage.module.css';
import buttonStyles from '../styles/common/buttons.module.css';

function DiagnosticianPage(): React.ReactElement {
  const { user } = useUserContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleDiagnose = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      // Fetch diagnostic data
      const diagnosticData = await fetchDiagnosticData(user.id);
      
      // Send to server for OpenAI analysis
      const result = await analyzeDiagnosticData(diagnosticData);
      
      // Display results
      setAnalysis(result.analysis);
    } catch (err) {
      console.error('Diagnostic analysis failed:', err);
      setError('Failed to analyze workout and pain data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.diagnosticianPage}>
      <div className={styles.pageHeader}>
        <h2>Workout Pain Analysis</h2>
      </div>
      
      <div className={styles.diagnosticContent}>
        <p>
          This tool analyzes your workout history and pain scores from the last two months
          to identify potential correlations between specific exercises and reported pain.
        </p>
        
        <div className={styles.actionSection}>
          <button 
            className={buttonStyles.primaryBtn}
            onClick={handleDiagnose}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Diagnose'}
          </button>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        {loading && <div className={styles.loading}>Analyzing your workout and pain data...</div>}
        
        {analysis && (
          <div className={styles.analysisResults}>
            <h3>Analysis Results</h3>
            <div className={styles.analysisContent}>
              {analysis.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiagnosticianPage;
