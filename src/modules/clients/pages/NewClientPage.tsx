import { useNavigate } from 'react-router-dom';
import { NewClientForm } from '../components/NewClientForm';

export function NewClientPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <span aria-hidden>←</span>
        Back to clients
      </button>
      <NewClientForm
        onCancel={() => navigate('/clients')}
        onCreated={(id) => navigate(`/clients/${id}`)}
      />
    </div>
  );
}
