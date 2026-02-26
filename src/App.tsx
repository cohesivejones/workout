import { Router, Route, Switch } from 'wouter';
import TimelinePage from './pages/TimelinePage';
import AddWorkoutPage from './pages/NewWorkoutPage';
import EditWorkoutPage from './pages/EditWorkoutPage';
import WorkoutShowPage from './pages/WorkoutShowPage';
import PainScorePage from './pages/PainScorePage';
import SleepScorePage from './pages/SleepScorePage';
import ExerciseListPage from './pages/ExerciseListPage';
import ExerciseProgressionPage from './pages/ExerciseProgressionPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DiagnosticianPage from './pages/DiagnosticianPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutCoachPage from './pages/WorkoutCoachPage';
import WorkoutInsightsPage from './pages/WorkoutInsightsPage';
import NotFoundPage from './pages/NotFoundPage';
import { Layout } from './Layout';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/">
          <Layout>
            <TimelinePage />
          </Layout>
        </Route>
        <Route path="/workouts/new">
          <Layout>
            <AddWorkoutPage />
          </Layout>
        </Route>
        <Route path="/workouts/:id/edit">
          <Layout>
            <EditWorkoutPage />
          </Layout>
        </Route>
        <Route path="/workouts/:id">
          <Layout>
            <WorkoutShowPage />
          </Layout>
        </Route>
        <Route path="/pain-scores/new">
          <Layout>
            <PainScorePage />
          </Layout>
        </Route>
        <Route path="/pain-scores/:id/edit">
          <Layout>
            <PainScorePage />
          </Layout>
        </Route>
        <Route path="/sleep-scores/new">
          <Layout>
            <SleepScorePage />
          </Layout>
        </Route>
        <Route path="/sleep-scores/:id/edit">
          <Layout>
            <SleepScorePage />
          </Layout>
        </Route>
        <Route path="/exercises/:id/progression">
          <Layout>
            <ExerciseProgressionPage />
          </Layout>
        </Route>
        <Route path="/exercises">
          <Layout>
            <ExerciseListPage />
          </Layout>
        </Route>
        <Route path="/change-password">
          <Layout>
            <ChangePasswordPage />
          </Layout>
        </Route>
        <Route path="/diagnostician">
          <Layout>
            <DiagnosticianPage />
          </Layout>
        </Route>
        <Route path="/dashboard">
          <Layout>
            <DashboardPage />
          </Layout>
        </Route>
        <Route path="/workout-coach">
          <Layout>
            <WorkoutCoachPage />
          </Layout>
        </Route>
        <Route path="/workout-insights">
          <Layout>
            <WorkoutInsightsPage />
          </Layout>
        </Route>
        <Route>
          <Layout>
            <NotFoundPage />
          </Layout>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
