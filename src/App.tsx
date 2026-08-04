import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { AppErrorBoundary } from './app/ErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  );
}
