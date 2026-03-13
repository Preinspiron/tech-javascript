import fb from '../assets/FB.png';
import google from '../assets/Google.png';

interface PartnersProps {
  onPartnerClick?: (partner: 'fb' | 'google') => void;
}

export function Partners({ onPartnerClick }: PartnersProps) {
  return (
    <div className="partners">
      <div className="partners-label">Partners</div>
      <div className="partners-logos">
        <img src={fb} alt="Facebook" role="button" tabIndex={0} onClick={() => onPartnerClick?.('fb')} onKeyDown={(e) => e.key === 'Enter' && onPartnerClick?.('fb')} />
        <img src={google} alt="Google" role="button" tabIndex={0} onClick={() => onPartnerClick?.('google')} onKeyDown={(e) => e.key === 'Enter' && onPartnerClick?.('google')} />
      </div>
    </div>
  );
}
