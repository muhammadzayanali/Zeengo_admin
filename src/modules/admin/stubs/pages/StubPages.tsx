import { useTranslation } from 'react-i18next';
import { StubPage } from './StubPage';

export function OperationsRoomPage() {
  const { t } = useTranslation();
  return (
    <StubPage
      title={t('nav.operationsRoom')}
      description="Live map of drivers, active trip routes, and ETAs. Map layer connects next."
    />
  );
}

export function GuidesPage() {
  const { t } = useTranslation();
  return (
    <StubPage
      title={t('nav.guides')}
      description="Tour guide roster, availability, and assignment queue for VIP itineraries."
    />
  );
}

export function RolesPage() {
  const { t } = useTranslation();
  return (
    <StubPage
      title={t('nav.roles')}
      description="Role matrix and permission policies for Command Center staff."
    />
  );
}

export function EmailPage() {
  const { t } = useTranslation();
  return (
    <StubPage
      title={t('nav.email')}
      description="Template library and delivery log for itinerary, receipt, and alert emails."
      ctaTo="/ai"
      ctaLabel="Open Ops Agent drafts"
    />
  );
}
