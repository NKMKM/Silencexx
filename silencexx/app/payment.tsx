import { PaymentPage } from '@/components/PaymentPage';
import { useLocalSearchParams } from 'expo-router';

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const planName = (params.planName as string) || 'Premium';
  const planPrice = (params.planPrice as string) || '399₽';

  return <PaymentPage planName={planName} planPrice={planPrice} />;
}
