import React from 'react';
import './ContactUs.css';

function ContactUs() {
  const githubLink = 'https://github.com/nikitpotdar';
    
  return (
    <div className="contact-us">
      <h1>Contact Us</h1>
      <p>Have questions or need assistance? Reach out to me at <a href="mailto:nikitpotdar@gmail.com">nikitpotdar@gmail.com</a></p>
      <p>Check out my github <a href={githubLink} target="_blank" rel="noopener noreferrer">GitHub</a> for more information.</p>
    </div>
  );
}

export default ContactUs;