import React from 'react';
import './ContactUs.css';

function ContactUs() {
  const linkedInLink = 'https://linkedin.com/in/nikit-potdar';
    
  return (
    <div className="contact-us">
      <h1>Contact</h1>
      <p>For any inquiries, support, or bug reports, please email me at <a href="mailto:nikitpotdar@gmail.com">nikitpotdar@gmail.com</a>.</p>
      <p>Let's connect on <a href={linkedInLink} target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
    </div>
  );
}

export default ContactUs;