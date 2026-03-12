import React from 'react';
import fb from '../assets/FB.png';
import google from '../assets/Google.png';
export function Partners() {
  return (
    <div className="partners">
      <div className="partners-label">Partners</div>
      <div className="partners-logos">
        <img src={fb} alt="Facebook" />
        <img src={google} alt="Google" />
      </div>
    </div>
  );
}
