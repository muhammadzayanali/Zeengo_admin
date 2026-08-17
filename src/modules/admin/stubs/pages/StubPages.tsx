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


