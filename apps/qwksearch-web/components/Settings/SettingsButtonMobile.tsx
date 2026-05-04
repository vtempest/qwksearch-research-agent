import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SettingsButtonMobile = () => {
  const router = useRouter();

  return (
    <button className="lg:hidden" onClick={() => router.push('/settings')}>
      <Settings size={18} />
    </button>
  );
};

export default SettingsButtonMobile;
