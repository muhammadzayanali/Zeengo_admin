import { useNavigate } from 'react-router-dom';
import { PageScaffold, EmptyState, Button } from '@/shared/ui';

export function StubPage({
  title,
  description,
  ctaTo = '/',
  ctaLabel = 'Back to dashboard',
}: {
  title: string;
  description: string;
  ctaTo?: string;
  ctaLabel?: string;
}) {
  const navigate = useNavigate();

  return (
    <PageScaffold
      title={title}
      description={description}
      primaryAction={
        <Button type="button" variant="secondary" onClick={() => navigate(ctaTo)}>
          {ctaLabel}
        </Button>
      }
    >
      <EmptyState
        title="Coming online"
        description="This Command Center surface is scaffolded. Connect live ops data in the next iteration."
      />
    </PageScaffold>
  );
}
