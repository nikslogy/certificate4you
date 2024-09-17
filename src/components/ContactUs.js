import React from 'react';
import './ContactUs.css';

function ContactUs() {
  const handleSubmit = (event) => {
    event.preventDefault();
    const myForm = event.target;
    const formData = new FormData(myForm);
  
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    })
      .then(() => console.log("Form successfully submitted"))
      .catch((error) => alert(error));
  };

  return (
    <div className="contact-us">
      <h1>Contact Us</h1>
      <p>For any inquiries, support, or bug reports, please email us at <a href="mailto:nikitpotdar@gmail.com">nikitpotdar@gmail.com</a> or fill out the form below:</p>
      <form name="contact" method="POST" data-netlify="true" onSubmit={handleSubmit}>
        <input type="hidden" name="form-name" value="contact" />
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            required
          ></textarea>
        </div>
        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}

export default ContactUs;